// 🧭 GPS Financier - Visualisation de la trajectoire financière
// ✅ Utilise useGuideProgress pour la logique centralisée
// 🎨 Theme support

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserData } from '../../context/UserDataContext';
import { useTheme } from '../../context/ThemeContext';
import { getConfirmedAccountsToday, markAccountAsConfirmed } from '../../utils/accountConfirmation';
import { useSubscription } from '../../context/SubscriptionContext';
import { UpgradeModal } from '../../components/common/UpgradePrompt';
import useGuideProgress from '../../hooks/useGuideProgress';
import PageGuideModal from '../../components/common/PageGuideModal';
// 🎯 Tooltips interactifs
import useTooltipTour from '../../hooks/useTooltipTour';
import TooltipTour from '../../components/common/TooltipTour';
import OptimizationModal from '../../components/GPS/OptimizationModal';
import PL4TOProposalModal from '../../components/GPS/PL4TOProposalModal';
import optimizationService from '../../services/optimization.service';

const GPSFinancier = ({ navigationMode = false, whatIfMode = false }) => {
  // whatIfMode: false = Pilote Auto (tous), 'foundations' = Les Fondations (fixes), 'smartRoute' = Smart Route (fixes + semi-fixes)
  
  // 🔧 DEBUG: Vérifier que navigationMode est reçu
  console.log('[GPSFinancier] 🧭 navigationMode:', navigationMode, '| whatIfMode:', whatIfMode);
  
  const { t, i18n } = useTranslation();
  const { userData, isLoading, saveUserData } = useUserData();
  const { canAccessGpsView, currentPlan } = useSubscription();
  const { theme, isDark } = useTheme();
  
  // ✅ Hook centralisé pour la progression du guide
  const { shouldShowGuide, markGuideCompleted, isGuideComplete, isLoading: isGuideLoading, guidesCompleted } = useGuideProgress();
  
  // ✅ Indicateur si le guide GPS est en cours (pour bloquer les interactions)
  const isGuideInProgress = !isGuideComplete && !isGuideLoading;
  
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
  } = useTooltipTour('gps', {
    onComplete: () => {
      // N'active "On continue!" que si c'est l'onboarding, pas le bouton d'aide
      if (!isManualTourRef.current) {
        setShowContinueBar(true);
      }
      isManualTourRef.current = false;
    }
  });
  
  // 🔧 Debug: Fonction globale pour tester les tooltips
  useEffect(() => {
    window.startGPSTour = () => {
      resetTooltips();
      setTimeout(() => startTooltipTour(), 100);
    };
    return () => delete window.startGPSTour;
  }, [startTooltipTour, resetTooltips]);
  
  // État pour le guide utilisateur
  const [showGuide, setShowGuide] = useState(false);
  const [showContinueBar, setShowContinueBar] = useState(false);
  const [hasStartedTooltipTour, setHasStartedTooltipTour] = useState(false); // 🔧 Empêcher redémarrage du tour
  
  // 💡 Ref pour tracker si le tour est lancé manuellement (bouton aide) vs onboarding
  const isManualTourRef = useRef(false);
  
  // État pour le modal d'upgrade (restrictions abonnement)
  const [upgradeModal, setUpgradeModal] = useState({ isOpen: false, type: null });
  
  // ✅ Déclarations de navigation (nécessaires pour le useEffect du guide)
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Vérifier si le guide doit être affiché (seulement en mode Navigation, pas Itinéraire)
  // ✅ Pour GPS Navigation: pas de modal, juste la barre "On continue"
  useEffect(() => {
    // Attendre que le guide soit chargé
    if (isGuideLoading) {
      console.log('[GPS Guide] ⏳ Chargement en cours...');
      return;
    }
    
    // Seulement sur la route /gps (pas /gps/itineraire)
    if (location.pathname !== '/gps') {
      console.log('[GPS Guide] ❌ Route ignorée:', location.pathname);
      return;
    }
    
    // Vérifier si on doit afficher le guide
    const shouldShow = shouldShowGuide('gps');
    console.log('[GPS Guide] navigationMode:', navigationMode, 'shouldShow:', shouldShow, 'guidesCompleted:', guidesCompleted);
    
    if (navigationMode && shouldShow && !showContinueBar && !isTooltipActive && !hasStartedTooltipTour) {
      console.log('[GPS Guide] ✅ Démarrage du tour de tooltips GPS');
      // Marquer comme démarré pour éviter le redémarrage
      setHasStartedTooltipTour(true);
      // Démarrer les tooltips - la barre "On continue" s'affichera à la fin (via onComplete)
      setShowGuide(false);
      startTooltipTour();
    }
  }, [navigationMode, isGuideLoading, shouldShowGuide, location.pathname, showContinueBar, guidesCompleted, isTooltipActive, startTooltipTour, hasStartedTooltipTour]);
  
  // Les modifications de budget sont stockées dans userData.budgetPlanning.modifications
  const scrollContainerRef = useRef(null);
  const rowRefs = useRef({});
  const sidebarMonthRef = useRef(null); // Ref pour scroller la sidebar des mois
  const hasHandledCalendarNav = useRef(false); // Pour éviter re-déclenchement navigation calendrier
  const blockAutoScroll = useRef(false); // Bloquer les scrolls automatiques temporairement
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const currentMonth = today.getMonth();
  
  // 📱 Détection mobile et orientation
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768 || window.innerHeight <= 500);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  
  // 📱 Détecter si on est en mode PWA (standalone)
  const [isPWA, setIsPWA] = useState(false);
  
  useEffect(() => {
    setIsPWA(window.matchMedia('(display-mode: standalone)').matches);
  }, []);
  
  useEffect(() => {
    const handleResize = () => {
      // Mobile si largeur <= 768 OU hauteur <= 500 (paysage mobile)
      setIsMobile(window.innerWidth <= 768 || window.innerHeight <= 500);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);
  
  const [viewMode, setViewMode] = useState('day');
  const [hasInitializedView, setHasInitializedView] = useState(false);
  const [startDate, setStartDate] = useState(todayStr);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [selectedYearKey, setSelectedYearKey] = useState(null);
  const [drillDownMonthKey, setDrillDownMonthKey] = useState(null); // Pour drill-down mois -> jour
  // Fonction pour scroller vers le haut de la zone de contenu
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };
  // Fonction pour scroller vers le bas (aujourd'hui) - pour navigation GPS inversée
  const scrollToBottom = () => {
    // Bloquer si navigation calendrier en cours
    if (blockAutoScroll.current) {
      console.log('[GPS] scrollToBottom bloqué - navigation calendrier en cours');
      return;
    }
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  // Inverser le scroll de la zone principale (molette bas = monte, molette haut = descend)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const newScrollTop = container.scrollTop - e.deltaY;
      container.scrollTop = Math.max(0, Math.min(newScrollTop, container.scrollHeight - container.clientHeight));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [viewMode]);
  const [visibleRows, setVisibleRows] = useState(new Set());
  const [animatingAccounts, setAnimatingAccounts] = useState({});
  const [activeTransferRows, setActiveTransferRows] = useState(new Set());
  const [activeActivityRows, setActiveActivityRows] = useState(new Set());
  const [triggeredRows, setTriggeredRows] = useState(new Set());
  const [selectedBubble, setSelectedBubble] = useState(null);
  const [hoveredRouteBubble, setHoveredRouteBubble] = useState(null); // Bulle survolée pour éclatement radial
  const [selectedTrajectoirePoint, setSelectedTrajectoirePoint] = useState({ type: 'today', dateStr: null, label: null });
  const [goalNotReachablePopup, setGoalNotReachablePopup] = useState(null);
  const [budgetEditPopup, setBudgetEditPopup] = useState(null); // Modal pour éditer budget à une date
  const [expandedModalSection, setExpandedModalSection] = useState(null); // Section étendue dans le modal ('entrees', 'sorties', 'linked')
  const [editingBudgetItem, setEditingBudgetItem] = useState(null); // Item en cours d'édition
  const [budgetVersion, setBudgetVersion] = useState(0); // Pour forcer le recalcul apres modification
  const [editDescription, setEditDescription] = useState('');
  const [editMontant, setEditMontant] = useState('');
  const [editFrequence, setEditFrequence] = useState('mensuel');
  const [editJourRecurrence, setEditJourRecurrence] = useState(1);
  const [editJourSemaine, setEditJourSemaine] = useState('');
  const [editMoisRecurrence, setEditMoisRecurrence] = useState('');
  const [editDateReference, setEditDateReference] = useState('');
  const [editDateDepart, setEditDateDepart] = useState(''); // Pour trimestriel/semestriel
  const [editDateFinRecurrence, setEditDateFinRecurrence] = useState(''); // Date de fin pour trimestriel/semestriel
  const [editCompte, setEditCompte] = useState('');
  const [confirmSavePopup, setConfirmSavePopup] = useState(null); // Popup de confirmation stylé
  const [confirmDeletePopup, setConfirmDeletePopup] = useState(null); // Popup de confirmation de suppression
  const [isFullScreen, setIsFullScreen] = useState(() => {
    // Initialiser depuis sessionStorage pour persister entre navigations GPS
    const saved = sessionStorage.getItem('gps_fullscreen');
    if (saved === 'true') return true;
    // Fallback: vérifier l'URL
    const params = new URLSearchParams(window.location.search);
    return params.get('fullscreen') === 'true';
  }); // Mode plein écran
  
  // Persister le fullscreen dans sessionStorage
  useEffect(() => {
    sessionStorage.setItem('gps_fullscreen', isFullScreen ? 'true' : 'false');
  }, [isFullScreen]);
  const [isRecalculating, setIsRecalculating] = useState(false); // Animation recalcul GPS (overlay)
  const [recalculatingStep, setRecalculatingStep] = useState(0); // Étape de l'animation (0, 1, 2)
  const [previousWhatIfMode, setPreviousWhatIfMode] = useState(whatIfMode); // Pour détecter changement de mode
  
  // 🆕 Animation recalcul GPS au changement de mode
  useEffect(() => {
    if (whatIfMode !== previousWhatIfMode) {
      setPreviousWhatIfMode(whatIfMode);
      setIsRecalculating(true);
      setRecalculatingStep(0);
      
      // Étape 1: Scanning (0.5s)
      setTimeout(() => setRecalculatingStep(1), 500);
      // Étape 2: Recalcul (0.5s)
      setTimeout(() => setRecalculatingStep(2), 1000);
      // Fin animation
      setTimeout(() => {
        setIsRecalculating(false);
        setRecalculatingStep(0);
      }, 1500);
    }
  }, [whatIfMode, previousWhatIfMode]);
  
  // 🆕 Forcer le plein écran pour les modes Fondations et Smart Route
  useEffect(() => {
    if (whatIfMode) {
      setIsFullScreen(true);
    }
  }, [whatIfMode]);
  
  const [isNavigatingToGoal, setIsNavigatingToGoal] = useState(false); // Animation navigation objectif (cercles rebondissants)
  const [isTrajectoireAvancee, setIsTrajectoireAvancee] = useState(false); // Vue Trajectoire Avancée
  const [overdraftAlert, setOverdraftAlert] = useState(null); // Alerte de découvert (Itinéraire)
  const [navOverdraftPopup, setNavOverdraftPopup] = useState(null); // Popup découvert Navigation (reste en fullscreen)
  const [navCreditLimitPopup, setNavCreditLimitPopup] = useState(null); // Popup limite crédit Navigation
  const [navGoalReachedPopup, setNavGoalReachedPopup] = useState(null); // Popup objectif atteint Navigation
  const [navWrongDirectionPopup, setNavWrongDirectionPopup] = useState(null); // Popup mauvaise direction Navigation
  const [dismissedWrongDirections, setDismissedWrongDirections] = useState(new Set()); // Objectifs mauvaise direction ignorés
  const [dataLoadLevel, setDataLoadLevel] = useState(1); // Niveau de chargement: 1=3ans, 2=10ans, 3=54ans
  const [todayTransactionsPopup, setTodayTransactionsPopup] = useState(null); // Popup transactions du jour
  const [transactionsConfirmedToday, setTransactionsConfirmedToday] = useState(() => {
    // Vérifier si déjà confirmé aujourd'hui
    const confirmedKey = `gps_transactions_confirmed_${new Date().toISOString().split('T')[0]}`;
    return localStorage.getItem(confirmedKey) === 'true';
  });
  
  // 🆕 Transactions confirmées individuellement (par ID unique)
  const [confirmedTransactions, setConfirmedTransactions] = useState(() => {
    const key = `gps_confirmed_transactions_${new Date().toISOString().split('T')[0]}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  });
  const [remindLaterClicked, setRemindLaterClicked] = useState(false); // "Rappeler plus tard" cliqué cette visite
  const [isViewChanging, setIsViewChanging] = useState(false); // Animation changement de vue
  const [skipViewAnimation, setSkipViewAnimation] = useState(false); // Skip animation lors navigation objectif
  const viewChangeTimerRef = useRef(null); // Ref pour le timer de changement de vue
  const pendingViewModeRef = useRef(null); // Vue en attente
  const [showPL4TOProposal, setShowPL4TOProposal] = useState(false);
  const [showPL4TORequestModal, setShowPL4TORequestModal] = useState(false); // Modal demande PL4TO 📊
  const [activeProposal, setActiveProposal] = useState(null);
  const [showOptimizationPopup, setShowOptimizationPopup] = useState(false); // Popup optimisation ♻️
  const [showRotateToPortraitPopup, setShowRotateToPortraitPopup] = useState(false); // 📱 Popup demandant de pivoter avant de quitter Itinéraire
  
  // 📱 Quand le popup "Pivotez" est affiché et que l'utilisateur pivote en portrait -> retourner à Navigation
  useEffect(() => {
    if (showRotateToPortraitPopup && isPortrait) {
      setShowRotateToPortraitPopup(false);
      // Naviguer vers la page Navigation GPS
      navigate('/gps');
    }
  }, [showRotateToPortraitPopup, isPortrait, navigate]);
  
  const [routeGlowEffect, setRouteGlowEffect] = useState(false); // Effet de brillance route après optimisation
  const [showPaymentRecommendation, setShowPaymentRecommendation] = useState(null); // Recommandation réduction remboursement
  const [currentRecommendationIndex, setCurrentRecommendationIndex] = useState(0); // Index de la recommandation actuelle
  const [scrollDirection, setScrollDirection] = useState('forward'); // Direction du scroll: 'forward' ou 'backward'
  const lastScrollTop = useRef(0); // Dernière position de scroll
  const [currentVisibleDateStr, setCurrentVisibleDateStr] = useState(null); // Date visible au centre pour le logo GPS
  
  // ✅ Navigation Mode hooks - MUST be at top level (React rules)
  const [navIndex, setNavIndex] = useState(0);
  const [navMonthIndex, setNavMonthIndex] = useState(0); // Index pour la vue Mois
  const [pendingCalendarNavMonth, setPendingCalendarNavMonth] = useState(null); // Mois cible en attente de navigation
  const [navYearIndex, setNavYearIndex] = useState(0); // Index pour la vue Année
  const [navAnimatingAccounts, setNavAnimatingAccounts] = useState({}); // Animation compteur Navigation
  const prevNavSoldes = useRef({}); // Soldes précédents pour animation
  const [perspectiveView, setPerspectiveView] = useState('day'); // 'year', 'month', 'day'
  const [navSelectedBubble, setNavSelectedBubble] = useState(null);
  const [confirmedToday, setConfirmedToday] = useState(true);
  const [dropAnimationActive, setDropAnimationActive] = useState(false); // Animation drop des bulles au passage plein écran
  const [isTeleporting, setIsTeleporting] = useState(false); // Bloquer les clics pendant la téléportation
  const [isViewTransitioning, setIsViewTransitioning] = useState(false); // Animation de changement de vue
  const [viewTransitionDirection, setViewTransitionDirection] = useState('out'); // 'out' = recul, 'in' = avance
  const teleportIntervalRef = useRef(null); // Référence pour l'intervalle de téléportation
  const touchStartYRef = useRef(0); // 📱 Position Y au début du touch pour scroll mobile
  // Refs pour tracker les index actuels (pour téléportation)
  const navIndexRef = useRef(0);
  const navMonthIndexRef = useRef(0);
  const navYearIndexRef = useRef(0);
  
  // État pour masquer/afficher les soldes
  const [balancesHidden, setBalancesHidden] = useState(() => {
    const saved = localStorage.getItem('pl4to_security_settings');
    return saved ? JSON.parse(saved).hideBalances : false;
  });
  
  // Réinitialiser la position du logo GPS quand on change de vue
  useEffect(() => {
    setCurrentVisibleDateStr(null);
  }, [viewMode]);
  
  // Fermer le modal et démarrer le tour de tooltips
  const closeModal = () => {
    setShowGuide(false);
    startTooltipTour(); // Démarre le tour de tooltips
  };
  
  // Marquer comme complété et passer à la page suivante
  const continueToNextPage = () => {
    setShowContinueBar(false);
    markGuideCompleted('gps');
    setTimeout(() => {
      navigate('/simulations');
    }, 100);
  };
  
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

  // Fonction pour changer de vue avec animation immédiate
  const changeViewMode = useCallback((newMode) => {
    // 🔒 Vérifier les restrictions d'abonnement pour les vues Mois et Année
    if (newMode === 'month' && !canAccessGpsView('month')) {
      setUpgradeModal({ isOpen: true, type: 'gpsMonth' });
      return;
    }
    if (newMode === 'year' && !canAccessGpsView('year')) {
      setUpgradeModal({ isOpen: true, type: 'gpsYear' });
      return;
    }
    
    // Annuler le timer précédent s'il existe
    if (viewChangeTimerRef.current) {
      clearTimeout(viewChangeTimerRef.current);
    }
    
    // Animation IMMÉDIATE - afficher le loader AVANT de changer la vue
    setIsViewChanging(true);
    
    // Utiliser requestAnimationFrame pour s'assurer que le loader est affiché
    // AVANT que React commence à recalculer la nouvelle vue
    requestAnimationFrame(() => {
      setViewMode(newMode);
      
      // Fin de l'animation après 600ms
      viewChangeTimerRef.current = setTimeout(() => {
        setIsViewChanging(false);
      }, 600);
    });
  }, [canAccessGpsView]);

  // Initialiser la vue par défaut selon le plan d'abonnement
  useEffect(() => {
    // Ne pas initialiser si on vient du calendrier (navigation avec targetMonth)
    // On vérifie aussi hasHandledCalendarNav pour éviter le re-trigger après nettoyage du state
    if (location.state?.targetMonth !== undefined || hasHandledCalendarNav.current) {
      setHasInitializedView(true);
      return;
    }
    
    // Ne pas initialiser si on vient de Navigation avec des paramètres URL
    const viewParam = searchParams.get('view');
    const dateParam = searchParams.get('date');
    if (viewParam || dateParam) {
      setHasInitializedView(true);
      return;
    }
    
    if (!hasInitializedView && currentPlan) {
      // Tous les plans commencent sur O-JOUR
      setViewMode('day');
      // Scroller vers le bas (aujourd'hui) après le rendu
      setTimeout(scrollToBottom, 100);
      setHasInitializedView(true);
    }
  }, [currentPlan, hasInitializedView, location.state, searchParams]);

  // Fonction pour ouvrir le modal d'édition de budget
  const openBudgetEdit = (dateStr, dateLabel, viewType) => {
    setBudgetEditPopup({
      dateStr,
      dateLabel,
      viewType // 'day', 'month', ou 'year'
    });
  };

  useEffect(() => {
    // Skip l'animation si on vient de la navigation objectif (déjà géré par triggerRecalculation)
    if (skipViewAnimation) {
      setSkipViewAnimation(false);
    }
    
    // Reset des states à chaque changement de vue
    setVisibleRows(new Set());
    setTriggeredRows(new Set());
    setAnimatingAccounts({});
    setActiveTransferRows(new Set());
    setActiveActivityRows(new Set());
    setSelectedRowIndex(0);
    // Note: Ne pas réinitialiser selectedMonthKey/selectedYearKey ici
    // car cela écraserait la sélection du drill-down
  }, [viewMode, skipViewAnimation]);


  // Gérer la touche Escape pour quitter le plein écran
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // 🔧 CLEANUP: Réinitialiser isFullScreen et fermer tous les popups quand on quitte la page GPS
  // Solution agressive: utilise beforeunload + visibilitychange + pathname
  useEffect(() => {
    // Handler pour réinitialiser au changement de route
    const handleRouteChange = () => {
      if (!window.location.pathname.startsWith('/gps')) {
        setIsFullScreen(false);
        // Fermer tous les popups
        setNavOverdraftPopup(null);
        setNavCreditLimitPopup(null);
        setNavGoalReachedPopup(null);
        setNavWrongDirectionPopup(null);
        setTodayTransactionsPopup(null);
        setSelectedBubble(null);
      }
    };
    
    // Handler pour la navigation (beforeunload, popstate)
    const handleBeforeUnload = () => setIsFullScreen(false);
    const handlePopState = () => handleRouteChange();
    
    // Écouter les événements de navigation
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    // Vérifier immédiatement si on n'est pas sur /gps
    handleRouteChange();
    
    // Cleanup au démontage
    return () => {
      // Note: On ne réinitialise PAS isFullScreen ici car cela bloque la navigation entre modes GPS
      // Fermer tous les popups au démontage
      setNavOverdraftPopup(null);
      setNavCreditLimitPopup(null);
      setNavGoalReachedPopup(null);
      setNavWrongDirectionPopup(null);
      setTodayTransactionsPopup(null);
      setSelectedBubble(null);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location.pathname]);

  // 🔧 FIX: Initialiser le mode selon navigationMode et paramètres URL
  const hasInitializedFromUrl = useRef(false);
  
  useEffect(() => {
    // ✅ Ne pas forcer le fullscreen si le guide est en cours (pour voir le modal)
    if (isGuideInProgress || showGuide || showContinueBar) {
      console.log('[GPS] Fullscreen bloqué - guide en cours');
      return;
    }
    
    if (!navigationMode) {
      // Mode Itinéraire - activer plein écran et lire le viewMode depuis l'URL
      setIsFullScreen(true);
      const viewParam = searchParams.get('view');
      if (viewParam && ['day', 'month', 'year'].includes(viewParam)) {
        setViewMode(viewParam);
      }
    } else {
      // Mode Navigation - TOUJOURS démarrer en plein écran pour montrer la vue Navigation
      setIsFullScreen(true);
      hasInitializedFromUrl.current = false;
    }
  }, [navigationMode, searchParams, isGuideInProgress, showGuide, showContinueBar]);

  // Fonction pour déclencher l'animation de recalcul GPS - RAPIDE
  // Animation de navigation vers un objectif (cercles rebondissants dans Navigation)
  const triggerRecalculation = useCallback((onComplete) => {
    setIsNavigatingToGoal(true);
    
    // Animation de 1 seconde puis exécuter le callback
    setTimeout(() => {
      if (onComplete) onComplete();
      setTimeout(() => {
        setIsNavigatingToGoal(false);
      }, 200);
    }, 1000);
  }, []);

  const accounts = userData?.accounts || [];
  const initialBalances = userData?.initialBalances?.soldes || [];
  const baseBudgetEntrees = userData?.budgetPlanning?.entrees || [];
  const baseBudgetSorties = userData?.budgetPlanning?.sorties || [];
  
  // 🔗 DÉTECTION DES TRANSFERTS LIÉS (même logique que Budget.jsx)
  // Les transferts liés sont des mouvements entre comptes qui ne sont pas de vrais revenus
  const findLinkedItems = useMemo(() => {
    const links = [];
    const usedEntrees = new Set();
    const usedSorties = new Set();
    
    const getBaseName = (description) => {
      if (!description) return '';
      const beforeDash = description.split('-')[0].trim().toLowerCase();
      return beforeDash;
    };
    
    baseBudgetEntrees.forEach((entree, entreeIndex) => {
      if (usedEntrees.has(entreeIndex)) return;
      
      const entreeBaseName = getBaseName(entree.description);
      
      baseBudgetSorties.forEach((sortie, sortieIndex) => {
        if (usedSorties.has(sortieIndex)) return;
        if (usedEntrees.has(entreeIndex)) return;
        
        const sortieBaseName = getBaseName(sortie.description);
        
        const sameMontant = Math.abs(parseFloat(entree.montant) - parseFloat(sortie.montant)) < 0.01;
        const sameFrequence = entree.frequence === sortie.frequence;
        const sameJour = entree.jourRecurrence === sortie.jourRecurrence;
        const differentComptes = entree.compte && sortie.compte && entree.compte !== sortie.compte;
        const sameBaseName = entreeBaseName && sortieBaseName && entreeBaseName === sortieBaseName;
        
        if (sameMontant && sameFrequence && sameJour && differentComptes && sameBaseName) {
          links.push({ entreeIndex, sortieIndex, entree, sortie });
          usedEntrees.add(entreeIndex);
          usedSorties.add(sortieIndex);
        }
      });
    });
    
    return links;
  }, [baseBudgetEntrees, baseBudgetSorties]);
  
  // 🔗 Sets des index des entrées/sorties liées (pour filtrage rapide)
  const linkedEntreeDescriptions = useMemo(() => 
    new Set(findLinkedItems.map(l => l.entree.description)), 
    [findLinkedItems]
  );
  
  // 📨 Charger la proposition PL4TO active
useEffect(() => {
  const loadActiveProposal = async () => {
    try {
      const result = await optimizationService.getActiveRequest();
      if (result.hasActiveRequest && result.request?.status === 'proposal_ready') {
        setActiveProposal(result.request);
      }
    } catch (err) {
      setActiveProposal(null);
    }
  };
  if (userData && !isLoading) loadActiveProposal();
}, [userData, isLoading]);
  const budgetModifications = userData?.budgetPlanning?.modifications || [];
  const financialGoals = userData?.financialGoals || [];

  // ============================================
  // OPTIONS POUR LE FORMULAIRE DE BUDGET
  // ============================================
  
  // Liste des mois pour la fréquence annuelle
  const moisOptions = [
    { value: '1', label: t('months.january') },
    { value: '2', label: t('months.february') },
    { value: '3', label: t('months.march') },
    { value: '4', label: t('months.april') },
    { value: '5', label: t('months.may') },
    { value: '6', label: t('months.june') },
    { value: '7', label: t('months.july') },
    { value: '8', label: t('months.august') },
    { value: '9', label: t('months.september') },
    { value: '10', label: t('months.october') },
    { value: '11', label: t('months.november') },
    { value: '12', label: t('months.december') }
  ];

  // Liste des jours de la semaine
  const joursSemaine = [
    { value: '0', label: t('days.sunday') }, 
    { value: '1', label: t('days.monday') }, 
    { value: '2', label: t('days.tuesday') },
    { value: '3', label: t('days.wednesday') }, 
    { value: '4', label: t('days.thursday') }, 
    { value: '5', label: t('days.friday') }, 
    { value: '6', label: t('days.saturday') }
  ];

  // Liste des fréquences
  const frequenceOptions = [
    { value: 'mensuel', label: t('budget.frequencies.monthly') },
    { value: 'bimensuel', label: t('budget.frequencies.biweekly') },
    { value: 'quinzaine', label: t('budget.frequencies.semimonthly') },
    { value: 'hebdomadaire', label: t('budget.frequencies.weekly') },
    { value: 'trimestriel', label: t('budget.frequencies.quarterly') },
    { value: 'semestriel', label: t('budget.frequencies.biannual') },
    { value: 'annuel', label: t('budget.frequencies.annual') },
    { value: 'uneFois', label: t('budget.frequencies.oneTime') }
  ];
  
  // Calculer la date minimum (aujourd'hui - 9 mois) pour trimestriel/semestriel
  const getMinDateDepart = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 9);
    return date.toISOString().split('T')[0];
  };
  
  // Calculer une date de fin suggérée (5 ans par défaut)
  const getSuggestedEndDate = (startDate) => {
    if (!startDate) return '';
    const date = new Date(startDate);
    date.setFullYear(date.getFullYear() + 5);
    return date.toISOString().split('T')[0];
  };

  // Fonction pour obtenir les 15 derniers jours (pour bi-hebdomadaire)
  const getLast15Days = () => {
    const dates = [];
    for (let i = 0; i <= 15; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'long', day: 'numeric', month: 'long' })
      });
    }
    return dates;
  };

  // ============================================
  // FONCTION CLE: Obtenir le budget effectif pour une date
  // Avant date modification = Budget de base (page Budget)
  // A partir date modification = Budget modifie
  // ============================================
  const getEffectiveBudget = useCallback((dateStr) => {
    if (!budgetModifications || budgetModifications.length === 0) {
      let resultEntrees = baseBudgetEntrees;
      let resultSorties = baseBudgetSorties;
      
      // 🆕 FILTRE WHAT-IF même sans modifications
      if (whatIfMode === 'foundations') {
        // Les Fondations: fixes seulement
        resultEntrees = resultEntrees.filter(e => e.flexibility === 'fixed');
        resultSorties = resultSorties.filter(s => s.flexibility === 'fixed');
      } else if (whatIfMode === 'smartRoute') {
        // Smart Route: fixes + semi-fixes (exclure variables)
        resultEntrees = resultEntrees.filter(e => e.flexibility === 'fixed' || e.flexibility === 'semi-fixed');
        resultSorties = resultSorties.filter(s => s.flexibility === 'fixed' || s.flexibility === 'semi-fixed');
      }
      
      return {
        entrees: resultEntrees,
        sorties: resultSorties,
        isModified: false,
        isWhatIf: whatIfMode
      };
    }
    
    // Trier par date decroissante pour trouver la modification la plus recente applicable
    // Support pour dateEffet (ancien format) et dateDebut (nouveau format OPE)
    const sortedMods = [...budgetModifications]
      .filter(mod => mod && (mod.dateEffet || mod.dateDebut)) // Filtrer les entrées invalides
      .sort((a, b) => {
        const dateA = a.dateEffet || a.dateDebut || '';
        const dateB = b.dateEffet || b.dateDebut || '';
        return dateB.localeCompare(dateA);
      });
    
    // Trouver la premiere modification dont dateEffet/dateDebut <= dateStr
    const applicableMod = sortedMods.find(mod => {
      const modDate = mod.dateEffet || mod.dateDebut;
      return modDate && modDate <= dateStr;
    });
    
    // Déterminer les budgets de base
    let resultEntrees = applicableMod ? (applicableMod.entrees || baseBudgetEntrees) : baseBudgetEntrees;
    let resultSorties = applicableMod ? (applicableMod.sorties || baseBudgetSorties) : baseBudgetSorties;
    
    // 🆕 FILTRE WHAT-IF: Mode Survie = budgets fixes seulement
    if (whatIfMode === 'foundations') {
      // Les Fondations: fixes seulement
      resultEntrees = resultEntrees.filter(e => e.flexibility === 'fixed');
      resultSorties = resultSorties.filter(s => s.flexibility === 'fixed');
    } else if (whatIfMode === 'smartRoute') {
      // Smart Route: fixes + semi-fixes (exclure variables)
      resultEntrees = resultEntrees.filter(e => e.flexibility === 'fixed' || e.flexibility === 'semi-fixed');
      resultSorties = resultSorties.filter(s => s.flexibility === 'fixed' || s.flexibility === 'semi-fixed');
    }
    
    return {
      entrees: resultEntrees,
      sorties: resultSorties,
      isModified: !!applicableMod,
      modificationDate: applicableMod ? (applicableMod.dateEffet || applicableMod.dateDebut) : null,
      isWhatIf: whatIfMode
    };
  }, [baseBudgetEntrees, baseBudgetSorties, budgetModifications, whatIfMode]);

  // 🆕 Fonction pour obtenir les budgets EXCLUS par le mode What-If (pour bulles fantômes)
  const getExcludedBudgets = useCallback((dateStr) => {
    // Pilote Auto = tout inclus, donc rien d'exclu
    if (!whatIfMode || whatIfMode === 'pilotAuto') {
      return { entrees: [], sorties: [] };
    }
    
    // Obtenir les budgets de base (avec modifications si applicable)
    let baseEntrees = baseBudgetEntrees;
    let baseSorties = baseBudgetSorties;
    
    if (budgetModifications && budgetModifications.length > 0) {
      const sortedMods = [...budgetModifications]
        .filter(mod => mod && (mod.dateEffet || mod.dateDebut))
        .sort((a, b) => {
          const dateA = a.dateEffet || a.dateDebut || '';
          const dateB = b.dateEffet || b.dateDebut || '';
          return dateB.localeCompare(dateA);
        });
      
      const applicableMod = sortedMods.find(mod => {
        const modDate = mod.dateEffet || mod.dateDebut;
        return modDate && modDate <= dateStr;
      });
      
      if (applicableMod) {
        baseEntrees = applicableMod.entrees || baseBudgetEntrees;
        baseSorties = applicableMod.sorties || baseBudgetSorties;
      }
    }
    
    // Filtrer pour obtenir les budgets EXCLUS (inclure tous, avec ou sans compte associé)
    // Si flexibility n'est pas défini, on considère comme 'variable' par défaut
    if (whatIfMode === 'foundations') {
      // Fondations inclut: fixed
      // Fondations exclut: semi-fixed + variable + non défini
      return {
        entrees: baseEntrees.filter(e => e.flexibility === 'semi-fixed' || e.flexibility === 'variable' || !e.flexibility),
        sorties: baseSorties.filter(s => s.flexibility === 'semi-fixed' || s.flexibility === 'variable' || !s.flexibility)
      };
    } else if (whatIfMode === 'smartRoute') {
      // Smart Route inclut: fixed + semi-fixed
      // Smart Route exclut: variable + non défini
      return {
        entrees: baseEntrees.filter(e => e.flexibility === 'variable' || !e.flexibility),
        sorties: baseSorties.filter(s => s.flexibility === 'variable' || !s.flexibility)
      };
    }
    
    return { entrees: [], sorties: [] };
  }, [baseBudgetEntrees, baseBudgetSorties, budgetModifications, whatIfMode]);

  // Effect pour pré-sélectionner un budget quand le modal s'ouvre avec preSelectBudget
  useEffect(() => {
    if (budgetEditPopup && budgetEditPopup.preSelectBudget) {
      const { type, description, compte, suggestedAmount, suggestedFrequence } = budgetEditPopup.preSelectBudget;
      
      // Obtenir le budget effectif pour la date
      const effectiveBudget = getEffectiveBudget(budgetEditPopup.dateStr);
      const items = type === 'entree' ? effectiveBudget.entrees : effectiveBudget.sorties;
      
      // Trouver le budget correspondant
      const budgetIndex = items.findIndex(item => 
        item.description === description && item.compte === compte
      );
      
      if (budgetIndex !== -1) {
        const item = items[budgetIndex];
        // Pré-remplir les champs d'édition
        setEditDescription(item.description || '');
        setEditMontant(String(suggestedAmount || item.montant || ''));
        // Utiliser la fréquence suggérée si fournie, sinon garder l'originale
        setEditFrequence(suggestedFrequence || item.frequence || 'mensuel');
        setEditJourRecurrence(item.jourRecurrence || 1);
        setEditJourSemaine(item.jourSemaine || '');
        setEditMoisRecurrence(item.moisRecurrence || '');
        setEditDateReference(item.dateReference || '');
        setEditDateDepart(item.dateDepart || '');
        setEditDateFinRecurrence(item.dateFinRecurrence || '');
        setEditCompte(item.compte || '');
        setEditingBudgetItem({ ...item, type, index: budgetIndex, fromRecommendation: true });
        setExpandedModalSection(type === 'entree' ? 'entrees' : 'sorties');
      }
      
      // Nettoyer preSelectBudget pour éviter la re-sélection
      setBudgetEditPopup(prev => ({ ...prev, preSelectBudget: null }));
    }
  }, [budgetEditPopup?.preSelectBudget, getEffectiveBudget]);

  // Calculer la balance mensuelle pour le budget actuel (doit être après baseBudgetEntrees/Sorties)
  const budgetBalance = useMemo(() => {
    let totalEntrees = 0;
    let totalSorties = 0;
    
    baseBudgetEntrees.forEach(item => {
      const montant = parseFloat(item.montant) || 0;
      switch (item.frequence) {
        case 'mensuel': totalEntrees += montant; break;
        case 'quinzaine':
        case 'bimensuel': totalEntrees += montant * 2; break;
        case 'hebdomadaire': totalEntrees += montant * 4; break;
        case 'trimestriel': totalEntrees += montant / 3; break;
        case 'semestriel': totalEntrees += montant / 6; break;
        case 'annuel': totalEntrees += montant / 12; break;
        case 'uneFois': case '1-fois': break; // N'affecte pas la balance mensuelle récurrente
        default: totalEntrees += montant;
      }
    });
    
    baseBudgetSorties.forEach(item => {
      const montant = parseFloat(item.montant) || 0;
      switch (item.frequence) {
        case 'mensuel': totalSorties += montant; break;
        case 'quinzaine':
        case 'bimensuel': totalSorties += montant * 2; break;
        case 'hebdomadaire': totalSorties += montant * 4; break;
        case 'trimestriel': totalSorties += montant / 3; break;
        case 'semestriel': totalSorties += montant / 6; break;
        case 'annuel': totalSorties += montant / 12; break;
        case 'uneFois': case '1-fois': break; // N'affecte pas la balance mensuelle récurrente
        default: totalSorties += montant;
      }
    });
    
    return { totalEntrees, totalSorties, balance: totalEntrees - totalSorties };
  }, [baseBudgetEntrees, baseBudgetSorties, budgetVersion]);

  const parseLocalDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // 🔄 Budgets avec optimisation configurée
  const optimizedBudgets = useMemo(() => {
    const budgets = [];
    const entrees = userData?.budgetPlanning?.entrees || [];
    const sorties = userData?.budgetPlanning?.sorties || [];
    
    entrees.forEach(e => {
      if (e.optimization?.enabled) {
        budgets.push({ ...e, type: 'entree' });
      }
    });
    
    sorties.forEach(s => {
      if (s.optimization?.enabled) {
        budgets.push({ ...s, type: 'sortie' });
      }
    });
    
    return budgets;
  }, [userData?.budgetPlanning?.entrees, userData?.budgetPlanning?.sorties]);
  
  const optimizedCount = optimizedBudgets.length;
  const hasOptimizedBudgets = optimizedCount > 0;
  
  // Vérifier si l'utilisateur a modifié son budget APRÈS sa dernière review d'optimisation
  const budgetModifiedAfterReview = useMemo(() => {
    const lastReview = userData?.budgetPlanning?.lastOptimizationReviewedAt;
    const lastBudgetModif = userData?.budgetPlanning?.lastModifiedAt;
    
    // Si pas de modification de budget enregistrée -> pas de badge
    // (le badge apparaîtra seulement après une prochaine modification)
    if (!lastBudgetModif) return false;
    
    // Si jamais reviewé mais budget modifié -> montrer le badge
    if (!lastReview) return true;
    
    // Comparer les dates avec une tolérance de 10 secondes
    // (pour gérer le cas où l'optimisation modifie le budget et met à jour les deux en même temps)
    const reviewDate = new Date(lastReview).getTime();
    const modifDate = new Date(lastBudgetModif).getTime();
    const tolerance = 10000; // 10 secondes
    
    // Badge visible seulement si budget modifié SIGNIFICATIVEMENT après la review
    return modifDate > (reviewDate + tolerance);
  }, [userData?.budgetPlanning?.lastOptimizationReviewedAt, userData?.budgetPlanning?.lastModifiedAt]);
  
  // Badge optimisation visible si:
  // 1. L'utilisateur a des budgets optimisés ET n'a jamais fait de review
  // OU 2. L'utilisateur a des budgets optimisés ET a modifié après la dernière review
  const showOptimizationBadge = hasOptimizedBudgets && budgetModifiedAfterReview;

  // Note: Migration supprimée - elle empêchait le badge de s'afficher pour les nouveaux utilisateurs
  // car elle initialisait lastOptimizationReviewedAt = lastModifiedAt immédiatement

  // Tableau traduit pour l'affichage uniquement
  const monthsShort = useMemo(() => [
    t('monthsShort.jan'), t('monthsShort.feb'), t('monthsShort.mar'),
    t('monthsShort.apr'), t('monthsShort.may'), t('monthsShort.jun'),
    t('monthsShort.jul'), t('monthsShort.aug'), t('monthsShort.sep'),
    t('monthsShort.oct'), t('monthsShort.nov'), t('monthsShort.dec')
  ], [t]);

  // Fonction pour formater un label de date (utilise la traduction)
  const formatDayLabel = useCallback((date) => {
    return `${date.getDate()} ${monthsShort[date.getMonth()]} ${date.getFullYear()}`;
  }, [monthsShort]);

  const formatDayShortLabel = useCallback((date) => {
    return `${date.getDate()} ${monthsShort[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
  }, [monthsShort]);

  const formatMonthLabel = useCallback((monthIndex, year) => {
    return `${monthsShort[monthIndex]} ${year}`;
  }, [monthsShort]);

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
          // Weekly: Match by day of week (0=Sunday, 6=Saturday)
          if (item.jourSemaine !== undefined && item.jourSemaine !== '') {
            isMatch = date.getDay() === parseInt(item.jourSemaine);
          } else {
            // Fallback: use jourRecurrence as day of week
            isMatch = date.getDay() === (jour % 7);
          }
          break;
        case 'trimestriel':
          // Trimestriel: tous les 3 mois à partir de dateDepart jusqu'à dateFinRecurrence
          if (item.dateDepart) {
            const startDate = parseLocalDate(item.dateDepart);
            const startDay = startDate.getDate();
            const startMonth = startDate.getMonth();
            const startYear = startDate.getFullYear();
            const currentMonth = date.getMonth();
            const currentYear = date.getFullYear();
            
            // Vérifier la date de fin si elle existe
            if (item.dateFinRecurrence) {
              const endDate = parseLocalDate(item.dateFinRecurrence);
              if (date > endDate) {
                isMatch = false;
                break;
              }
            }
            
            const monthsDiff = (currentYear - startYear) * 12 + (currentMonth - startMonth);
            isMatch = monthsDiff >= 0 && monthsDiff % 3 === 0 && checkDayMatch(startDay);
          } else {
            isMatch = checkDayMatch(jour) && date.getMonth() % 3 === 0;
          }
          break;
        case 'semestriel':
          // Semestriel: tous les 6 mois à partir de dateDepart jusqu'à dateFinRecurrence
          if (item.dateDepart) {
            const startDate = parseLocalDate(item.dateDepart);
            const startDay = startDate.getDate();
            const startMonth = startDate.getMonth();
            const startYear = startDate.getFullYear();
            const currentMonth = date.getMonth();
            const currentYear = date.getFullYear();
            
            // Vérifier la date de fin si elle existe
            if (item.dateFinRecurrence) {
              const endDate = parseLocalDate(item.dateFinRecurrence);
              if (date > endDate) {
                isMatch = false;
                break;
              }
            }
            
            const monthsDiff = (currentYear - startYear) * 12 + (currentMonth - startMonth);
            isMatch = monthsDiff >= 0 && monthsDiff % 6 === 0 && checkDayMatch(startDay);
          } else {
            isMatch = checkDayMatch(jour) && (date.getMonth() === 0 || date.getMonth() === 6);
          }
          break;
        case 'uneFois':
        case '1-fois':
          // Une seule fois: transaction unique à la date spécifiée
          if (item.dateDepart || item.date) {
            const targetDate = parseLocalDate(item.dateDepart || item.date);
            isMatch = date.getFullYear() === targetDate.getFullYear() &&
                      date.getMonth() === targetDate.getMonth() &&
                      date.getDate() === targetDate.getDate();
          } else {
            isMatch = false;
          }
          break;
        case 'annuel':
          // Annual: Match day AND month (use moisRecurrence if available, otherwise January)
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

  // ============================================
  // SYSTÈME DE CALCUL EN CASCADE
  // Source unique: allDayData → monthData → yearData
  // ============================================

  // ÉTAPE 1: Calculer TOUS les jours (source unique de vérité) - CHARGEMENT PROGRESSIF
  const allDayData = useMemo(() => {
    const data = [];
    
    // Initialiser les soldes depuis les comptes
    const runningBalances = {};
    accounts.forEach(acc => {
      const solde = initialBalances.find(s => s.accountName === acc.nom);
      runningBalances[acc.nom] = parseFloat(solde?.solde) || 0;
    });

    // Toujours commencer depuis aujourd'hui
    const start = new Date(today);
    
    // Nombre de jours selon le niveau de chargement
    // Niveau 1: 1095 jours (3 ans) - affichage rapide
    // Niveau 2: 3650 jours (10 ans) - chargement moyen
    // Niveau 3: 19710 jours (54 ans) - chargement complet
    const daysToLoad = dataLoadLevel === 1 ? 1095 : dataLoadLevel === 2 ? 3650 : 19710;
    
    // Obtenir les comptes confirmés aujourd'hui (pour ne pas recalculer leurs transactions)
    const confirmedAccountsToday = getConfirmedAccountsToday();
    
    for (let i = 0; i < daysToLoad; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const currentDateStr = formatDateStr(currentDate);
      
      // Obtenir le budget effectif pour cette date
      const effectiveBudget = getEffectiveBudget(currentDateStr);
      const budgetEntrees = effectiveBudget.entrees;
      const budgetSorties = effectiveBudget.sorties;
      
      // Obtenir les transactions du jour
      let entreesJour = getTransactionsForDate(currentDate, budgetEntrees, true);
      let sortiesJour = getTransactionsForDate(currentDate, budgetSorties, false);
      
      // 🆕 Pour aujourd'hui (i=0), filtrer les transactions confirmées INDIVIDUELLEMENT
      if (i === 0) {
        // Lire les transactions confirmées depuis localStorage
        const confirmedKey = `gps_confirmed_transactions_${currentDateStr}`;
        const savedConfirmed = localStorage.getItem(confirmedKey);
        const confirmedIds = savedConfirmed ? JSON.parse(savedConfirmed) : [];
        
        // Filtrer seulement les transactions confirmées individuellement
        if (confirmedIds.length > 0) {
          entreesJour = entreesJour.filter(t => {
            const transactionId = `${currentDateStr}_${t.compte}_entree_${t.description}_${t.montant}`;
            return !confirmedIds.includes(transactionId);
          });
          sortiesJour = sortiesJour.filter(t => {
            const transactionId = `${currentDateStr}_${t.compte}_sortie_${t.description}_${t.montant}`;
            return !confirmedIds.includes(transactionId);
          });
        }
        
        // Aussi exclure les comptes confirmés via l'ancien système (rétro-compatibilité)
        if (confirmedAccountsToday.length > 0) {
          entreesJour = entreesJour.filter(t => !confirmedAccountsToday.includes(t.compte));
          sortiesJour = sortiesJour.filter(t => !confirmedAccountsToday.includes(t.compte));
        }
      }
      
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

    return data;
  }, [accounts, initialBalances, baseBudgetEntrees, baseBudgetSorties, budgetModifications, todayStr, today, getEffectiveBudget, budgetVersion, dataLoadLevel, monthsShort, confirmedTransactions, whatIfMode]);

  // Chargement progressif des données (3 ans -> 10 ans -> 54 ans)
  useEffect(() => {
    if (dataLoadLevel < 3) {
      const timeout = setTimeout(() => {
        setDataLoadLevel(prev => prev + 1);
      }, dataLoadLevel === 1 ? 800 : 1500); // 800ms pour passer à 10 ans, 1500ms pour 54 ans
      return () => clearTimeout(timeout);
    }
  }, [dataLoadLevel]);

  // ============================================
  // TRANSACTIONS DU JOUR - Calcul pour badge et popup
  // ============================================
  const todayTransactionsData = useMemo(() => {
    if (!allDayData || allDayData.length === 0) return null;
    
    const todayData = allDayData.find(d => d.dateStr === todayStr);
    if (!todayData) return null;
    
    const transactions = [];
    
    accounts.forEach(acc => {
      const accData = todayData.accounts[acc.nom];
      if (accData) {
        accData.entrees.forEach(t => {
          // 🆕 ID unique pour chaque transaction
          const transactionId = `${todayStr}_${acc.nom}_entree_${t.description}_${t.montant}`;
          transactions.push({
            id: transactionId,
            compte: acc.nom,
            compteType: acc.type,
            description: t.description,
            montant: t.montant,
            isEntree: true
          });
        });
        accData.sorties.forEach(t => {
          // 🆕 ID unique pour chaque transaction
          const transactionId = `${todayStr}_${acc.nom}_sortie_${t.description}_${t.montant}`;
          transactions.push({
            id: transactionId,
            compte: acc.nom,
            compteType: acc.type,
            description: t.description,
            montant: t.montant,
            isEntree: false
          });
        });
      }
    });
    
    if (transactions.length === 0) return null;
    
    return {
      date: todayStr,
      dateLabel: new Date().toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }),
      transactions
    };
  }, [allDayData, accounts, todayStr, i18n.language, budgetVersion, baseBudgetEntrees, baseBudgetSorties]);
  
  // 🆕 Fonction pour confirmer une transaction individuellement
  const confirmTransaction = useCallback((transactionId) => {
    setConfirmedTransactions(prev => {
      const updated = [...prev, transactionId];
      const key = `gps_confirmed_transactions_${todayStr}`;
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  }, [todayStr]);
  
  // 🆕 Vérifier si une transaction est confirmée
  const isTransactionConfirmed = useCallback((transactionId) => {
    return confirmedTransactions.includes(transactionId);
  }, [confirmedTransactions]);
  
  // 🆕 Transactions non confirmées (pour badge et bulles)
  const pendingTransactions = useMemo(() => {
    if (!todayTransactionsData) return [];
    return todayTransactionsData.transactions.filter(t => !confirmedTransactions.includes(t.id));
  }, [todayTransactionsData, confirmedTransactions]);

  // Badge visible si transactions du jour non confirmées ET rappels non arrêtés
  const remindersStopped = localStorage.getItem(`gps_transactions_stopped_${todayStr}`);
  // 🆕 Utilise les transactions individuelles au lieu du flag global
  const hasPendingTransactions = pendingTransactions.length > 0 && !remindersStopped;
  // Badge 📅 visible seulement si pas de "rappeler plus tard" cliqué CETTE visite
  // Utilise un state local qui se réinitialise à chaque chargement de page
  const showTransactionBadge = hasPendingTransactions && !remindLaterClicked;

  // ============================================
  // DÉTECTION DES TRANSACTIONS DU JOUR
  // Le popup s'ouvre UNIQUEMENT quand l'utilisateur clique sur le badge 📅
  // L'auto-affichage au chargement est désactivé pour éviter les conflits
  // ============================================
  // NOTE: L'auto-popup a été désactivé car il causait des conflits avec Navigation
  // Le badge 📅 dans Navigation permet d'ouvrir le popup manuellement

  // ============================================
  // LIMITE DE JOURS SELON LE PLAN D'ABONNEMENT
  // ============================================
  const dayViewLimit = useMemo(() => {
    // Discovery (gratuit): 90 jours, Essentiel+: 180 jours
    return currentPlan === 'discovery' ? 90 : 180;
  }, [currentPlan]);

  // ============================================
  // DÉTECTION DES DÉCOUVERTS PRÉVUS
  // Affiche une alerte si un solde négatif est prévu (seulement sur Itinéraire, pas en Navigation)
  // ============================================
  const overdraftCheckDone = useRef(false);
  
  useEffect(() => {
    // Reset le flag quand on change de jour
    overdraftCheckDone.current = false;
  }, [todayStr]);
  
  useEffect(() => {
    // Éviter les exécutions multiples
    if (overdraftCheckDone.current) return;
    
    if (!userData || isLoading || !allDayData || allDayData.length === 0) return;
    
    // Ne pas déclencher en mode Navigation (fullscreen)
    if (isFullScreen) return;
    
    // Vérifier si on a déjà montré l'alerte aujourd'hui
    const dismissedKey = `gps_overdraft_alert_dismissed_${todayStr}`;
    const alreadyDismissed = localStorage.getItem(dismissedKey);
    
    if (alreadyDismissed) {
      overdraftCheckDone.current = true;
      return;
    }
    
    // Marquer comme vérifié pour éviter la boucle
    overdraftCheckDone.current = true;
    
    // Chercher le premier jour avec un compte chèque/épargne en négatif
    const daysToCheck = allDayData.slice(0, dayViewLimit);
    
    for (const day of daysToCheck) {
      if (day.isToday) continue; // Ne pas alerter pour aujourd'hui
      
      for (const [accountName, accountData] of Object.entries(day.accounts)) {
        // Seulement les comptes chèques et épargne (pas les cartes de crédit)
        if (accountData.isCredit) continue;
        
        // Si le solde est négatif
        if (accountData.solde < 0) {
          setOverdraftAlert({
            date: day.date,
            dateStr: day.dateStr,
            label: day.label,
            accountName: accountName,
            amount: accountData.solde
          });
          return; // Arrêter à la première alerte
        }
      }
    }
  }, [userData, isLoading, allDayData, todayStr, dayViewLimit, isFullScreen]);

  // Vue JOUR: les X premiers jours OU les jours du mois sélectionné (drill-down)
  const generateDayData = useMemo(() => {
    if (drillDownMonthKey) {
      // Drill-down: afficher tous les jours du mois sélectionné
      return allDayData.filter(day => day.monthKey === drillDownMonthKey);
    }
    // Par défaut: les X premiers jours selon le plan
    return allDayData.slice(0, dayViewLimit);
  }, [allDayData, drillDownMonthKey, budgetVersion, dayViewLimit]);

  const displayData = useMemo(() => {
    return generateDayData.filter(day => day.hasActivity || day.isToday);
  }, [generateDayData, budgetVersion]);

  // 🔄 Positionner l'Itinéraire sur la date passée en URL (après chargement des données)
  useEffect(() => {
    if (!navigationMode && generateDayData && generateDayData.length > 0) {
      const dateParam = searchParams.get('date');
      const viewParam = searchParams.get('view');
      
      if (dateParam && !hasInitializedFromUrl.current) {
        hasInitializedFromUrl.current = true;
        setStartDate(dateParam);
        
        // Extraire le mois et l'année de la date
        const dateParts = dateParam.split('-');
        const yearKey = dateParts[0];
        const monthKey = `${dateParts[0]}-${dateParts[1]}`;
        
        // Synchroniser selon la vue
        if (viewParam === 'year' && generateYearData && generateYearData.length > 0) {
          // Vue Année - synchroniser avec l'année
          setSelectedYearKey(yearKey);
          // Délai plus long pour laisser le DOM se rendre après changement de viewMode
          const scrollToYear = (attempts = 0) => {
            const element = document.getElementById(`year-row-${yearKey}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (attempts < 5) {
              // Réessayer après 200ms si l'élément n'est pas encore prêt
              setTimeout(() => scrollToYear(attempts + 1), 200);
            }
          };
          setTimeout(() => scrollToYear(), 500);
        } else if (viewParam === 'month' && generateMonthData && generateMonthData.length > 0) {
          // Vue Mois - synchroniser avec le mois
          setSelectedMonthKey(monthKey);
          // Délai plus long pour laisser le DOM se rendre après changement de viewMode
          const scrollToMonth = (attempts = 0) => {
            const element = document.getElementById(`month-row-${monthKey}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (attempts < 5) {
              // Réessayer après 200ms si l'élément n'est pas encore prêt
              setTimeout(() => scrollToMonth(attempts + 1), 200);
            }
          };
          setTimeout(() => scrollToMonth(), 500);
        } else {
          // Vue Jour (par défaut) - comportement existant
          setTimeout(() => {
            const targetIndex = generateDayData.findIndex(d => d.dateStr === dateParam);
            if (targetIndex !== -1) {
              setSelectedRowIndex(targetIndex);
              setTimeout(() => {
                const element = document.getElementById(`row-${dateParam}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 200);
            }
          }, 300);
        }
      }
    }
  }, [navigationMode, searchParams, generateDayData]);

  // Gérer la navigation depuis CalendrierO (Dashboard) vers un mois spécifique
  useEffect(() => {
    // Éviter de re-déclencher si déjà traité
    if (hasHandledCalendarNav.current) {
      return;
    }
    
    if (location.state?.targetMonth !== undefined && location.state?.targetYear !== undefined) {
      const targetMonth = location.state.targetMonth;
      const targetYear = location.state.targetYear;
      
      // Construire la clé du mois (format: "YYYY-MM")
      const monthKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
      
      // Attendre que les données soient chargées
      if (!generateDayData || generateDayData.length === 0) {
        return; // Attendre le prochain render
      }
      
      // Marquer comme traité AVANT de faire les changements
      hasHandledCalendarNav.current = true;
      
      // 🔒 Vérifier les restrictions d'abonnement pour Discovery
      if (!canAccessGpsView('month')) {
        // Vérifier si le mois cible est dans la plage de generateDayData
        const dayInRange = generateDayData.find(day => day.monthKey === monthKey);
        
        if (dayInRange) {
          // Le mois est dans la plage → naviguer vers vue JOUR
          setViewMode('day');
          // Ne pas passer en plein écran si startInNormalMode est true
          if (!location.state?.startInNormalMode) {
            setIsFullScreen(true);
          }
          
          // Trouver le jour cible: utiliser targetDate si fourni, sinon premier jour avec activité
          const targetDateStr = location.state?.targetDate;
          const dayToScrollTo = targetDateStr 
            ? (displayData.find(day => day.dateStr === targetDateStr) || generateDayData.find(day => day.dateStr === targetDateStr))
            : displayData.find(day => day.monthKey === monthKey);
          
          // Scroller vers la ligne après le rendu
          setTimeout(() => {
            if (dayToScrollTo) {
              const element = document.getElementById(`row-${dayToScrollTo.dateStr}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Effet visuel pour indiquer la date cible
                element.classList.add('goal-glow-orange');
                setTimeout(() => element.classList.remove('goal-glow-orange'), 3000);
              }
            } else if (targetDateStr) {
              // targetDate fourni mais pas trouvé dans displayData, essayer avec generateDayData
              const element = document.getElementById(`row-${targetDateStr}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('goal-glow-orange');
                setTimeout(() => element.classList.remove('goal-glow-orange'), 3000);
              }
            } else {
              // Si pas d'activité ce mois, scroller vers le haut
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = 0;
              }
            }
          }, 300);
        } else {
          // Le mois est hors de la plage → popup de restriction
          setUpgradeModal({ isOpen: true, type: 'gpsMonth' });
        }
        
        // Nettoyer le state via navigate pour vraiment effacer location.state
        const cleanUrl = location.state?.startInNormalMode ? '/gps' : '/gps?fullscreen=true';
        navigate(cleanUrl, { replace: true, state: {} });
        return;
      }
      
      // Plan Essentiel+ → navigation vers vue MOIS
      console.log('[GPS] Navigation calendrier - Plan Essentiel+, monthKey:', monthKey);
      
      // Bloquer les scrolls automatiques pendant la navigation
      blockAutoScroll.current = true;
      
      // Afficher l'animation de navigation
      setIsNavigatingToGoal(true);
      
      // Activer le plein écran sauf si startInNormalMode
      if (!location.state?.startInNormalMode) {
        setIsFullScreen(true);
      }
      
      // 1. D'abord activer la vue MOIS
      // changeViewMode pour O-JOUR et setPerspectiveView pour Navigation
      changeViewMode('month');
      setPerspectiveView('month');
      
      // Stocker le mois cible pour le positionnement (traité après que navigationMonths soit prêt)
      setPendingCalendarNavMonth(monthKey);
      
      // 2. Après que la vue soit rendue, scroller vers le mois cible
      setTimeout(() => {
        // Exactement comme le clic sidebar
        setSelectedMonthKey(monthKey);
        const element = document.getElementById(`month-row-${monthKey}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Deuxième scroll de sécurité après 1.5 seconde
        setTimeout(() => {
          const element2 = document.getElementById(`month-row-${monthKey}`);
          if (element2) {
            element2.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 1500);
        
        // Troisième scroll final après 3 secondes, puis débloquer et masquer animation
        setTimeout(() => {
          const element3 = document.getElementById(`month-row-${monthKey}`);
          if (element3) {
            element3.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Effet visuel
            element3.classList.add('goal-glow-orange');
            setTimeout(() => element3.classList.remove('goal-glow-orange'), 3000);
          }
          blockAutoScroll.current = false;
          setIsNavigatingToGoal(false);
          console.log('[GPS] Navigation calendrier terminée');
        }, 3000);
      }, 800);
      
      // Nettoyer le state
      const cleanUrl = location.state?.startInNormalMode ? '/gps' : '/gps?fullscreen=true';
      navigate(cleanUrl, { replace: true, state: {} });
    }
  }, [location.state, canAccessGpsView, generateDayData, displayData, navigate, changeViewMode]);

  // ÉTAPE 2: Agréger les jours en MOIS
  const generateMonthData = useMemo(() => {
    const monthsMap = new Map();
    
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
          // Solde de début = solde de la veille du premier jour du mois
          // Pour le premier mois, c'est le soldePrecedent du premier jour
          monthAccountsData[acc.nom] = {
            entrees: [],
            sorties: [],
            totalEntrees: 0,
            totalSorties: 0,
            soldeDebut: day.accounts[acc.nom].soldePrecedent,
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
        const monthAcc = monthData.accounts[acc.nom];
        
        // Ajouter les entrées avec le jour ET le compte
        dayAcc.entrees.forEach(t => {
          monthAcc.entrees.push({ ...t, jour: day.date.getDate(), compte: acc.nom });
        });
        
        // Ajouter les sorties avec le jour ET le compte
        dayAcc.sorties.forEach(t => {
          monthAcc.sorties.push({ ...t, jour: day.date.getDate(), compte: acc.nom });
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
        accData.variation = accData.soldeFin - accData.soldeDebut;
      });
    });
    
    // Retourner les 648 premiers mois (~54 ans)
    return result.slice(0, 648);
  }, [allDayData, accounts, today, budgetVersion, budgetModifications]);

  const displayMonthData = useMemo(() => {
    return generateMonthData.filter(month => month.hasActivity || month.isCurrentMonth);
  }, [generateMonthData, budgetVersion]);

  // ÉTAPE 3: Agréger les mois en ANNÉES
  const generateYearData = useMemo(() => {
    const yearsMap = new Map();
    
    generateMonthData.forEach((month, monthIndex) => {
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
            soldeDebut: month.accounts[acc.nom].soldeDebut,
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
        const yearAcc = yearData.accounts[acc.nom];
        
        // Ajouter toutes les entrées du mois (le compte est déjà inclus)
        monthAcc.entrees.forEach(t => {
          yearAcc.entrees.push({ ...t, month: month.month });
        });
        
        // Ajouter toutes les sorties du mois (le compte est déjà inclus)
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
        accData.variation = accData.soldeFin - accData.soldeDebut;
      });
    });
    
    // Retourner les 54 premières années
    return result.slice(0, 54);
  }, [generateMonthData, accounts, today, budgetVersion, budgetModifications]);

  const displayYearData = useMemo(() => {
    return generateYearData.filter(year => year.hasActivity || year.isCurrentYear);
  }, [generateYearData, budgetVersion]);


  const goalsWithProgress = useMemo(() => {
    return financialGoals.map(goal => {
      const soldeInfo = initialBalances.find(s => s.accountName === goal.compteAssocie);
      const soldeActuel = parseFloat(soldeInfo?.solde) || 0;
      const montantCible = parseFloat(goal.montantCible) || 0;
      
      const compte = accounts.find(a => a.nom === goal.compteAssocie);
      const isCredit = compte?.type === 'credit';
      
      let progression = 0;
      let montantRestant = 0;
      let isAchieved = false;
      
      if (isCredit) {
        const compteData = accounts.find(a => a.nom === goal.compteAssocie);
        const limite = parseFloat(compteData?.limite) || 6000;
        
        if (soldeActuel <= montantCible) {
          progression = 100;
          isAchieved = true;
          montantRestant = 0;
        } else {
          const aRembourser = soldeActuel - montantCible;
          const depuisLimite = limite - montantCible;
          progression = depuisLimite > 0 ? Math.max(0, ((limite - soldeActuel) / depuisLimite) * 100) : 0;
          montantRestant = aRembourser;
        }
      } else {
        if (soldeActuel >= montantCible) {
          progression = 100;
          isAchieved = true;
          montantRestant = 0;
        } else {
          progression = montantCible > 0 ? (soldeActuel / montantCible) * 100 : 0;
          montantRestant = montantCible - soldeActuel;
        }
      }
      
      const entreesCompte = baseBudgetEntrees.filter(e => e.compte === goal.compteAssocie);
      const sortiesCompte = baseBudgetSorties.filter(s => s.compte === goal.compteAssocie);
      
      let entreesParMois = 0;
      let sortiesParMois = 0;
      
      entreesCompte.forEach(entree => {
        const montant = parseFloat(entree.montant) || 0;
        switch (entree.frequence) {
          case 'mensuel':
            entreesParMois += montant;
            break;
          case 'quinzaine':
          case 'bimensuel':
            entreesParMois += montant * 2;
            break;
          case 'hebdomadaire':
            entreesParMois += montant * 4;
            break;
          case 'trimestriel':
            entreesParMois += montant / 3;
            break;
          case 'semestriel':
            entreesParMois += montant / 6;
            break;
          case 'annuel':
            entreesParMois += montant / 12;
            break;
          case 'uneFois': case '1-fois':
            break; // N'affecte pas le calcul mensuel
          default:
            entreesParMois += montant;
        }
      });
      
      sortiesCompte.forEach(sortie => {
        const montant = parseFloat(sortie.montant) || 0;
        switch (sortie.frequence) {
          case 'mensuel':
            sortiesParMois += montant;
            break;
          case 'quinzaine':
          case 'bimensuel':
            sortiesParMois += montant * 2;
            break;
          case 'hebdomadaire':
            sortiesParMois += montant * 4;
            break;
          case 'trimestriel':
            sortiesParMois += montant / 3;
            break;
          case 'semestriel':
            sortiesParMois += montant / 6;
            break;
          case 'annuel':
            sortiesParMois += montant / 12;
            break;
          case 'uneFois': case '1-fois':
            break; // N'affecte pas le calcul mensuel
          default:
            sortiesParMois += montant;
        }
      });
      
      const fluxNetParMois = entreesParMois - sortiesParMois;
      
      let isWrongDirection = false;
      
      if (!isAchieved && !isCredit) {
        isWrongDirection = sortiesParMois >= entreesParMois;
      } else if (!isAchieved && isCredit) {
        isWrongDirection = sortiesParMois >= entreesParMois;
      }
      
      let moisRestants = 0;
      let etaDate = null;
      let etaLabel = '';
      let realEtaDate = null;
      let realEtaLabel = '';
      let goalReachedDayStr = null;
      let goalReachedMonthKey = null;
      
      const isGoalReached = (solde) => {
        if (isCredit) {
          return solde <= montantCible;
        } else {
          return solde >= montantCible;
        }
      };
      
      const dayMatch = allDayData.find(day => {
        const accountData = day.accounts[goal.compteAssocie];
        if (accountData) {
          return isGoalReached(accountData.solde);
        }
        return false;
      });
      
      if (dayMatch) {
        goalReachedDayStr = dayMatch.dateStr;
      }
      
      const monthMatch = generateMonthData.find(month => {
        const accountData = month.accounts[goal.compteAssocie];
        if (accountData) {
          return isGoalReached(accountData.soldeFin);
        }
        return false;
      });
      
      if (monthMatch) {
        realEtaDate = new Date(monthMatch.year, monthMatch.month);
        goalReachedMonthKey = monthMatch.monthKey;
        realEtaLabel = `${monthsShort[monthMatch.month]} ${monthMatch.year}`;
      } else {
        const yearMatch = generateYearData.find(year => {
          const accountData = year.accounts[goal.compteAssocie];
          if (accountData) {
            return isGoalReached(accountData.soldeFin);
          }
          return false;
        });
        
        if (yearMatch) {
          realEtaDate = new Date(yearMatch.year, 11);
          realEtaLabel = `${yearMatch.year}`;
        }
      }
      
      if (isAchieved) {
        etaLabel = t('gps.goalStatus.achieved');
      } else if (isWrongDirection) {
        etaLabel = t('gps.goalStatus.wrongDirection');
      } else if (realEtaLabel) {
        etaDate = realEtaDate;
        etaLabel = realEtaLabel;
        if (realEtaDate) {
          const now = new Date();
          moisRestants = (realEtaDate.getFullYear() - now.getFullYear()) * 12 + 
                         (realEtaDate.getMonth() - now.getMonth());
        }
      } else if (fluxNetParMois > 0 && montantRestant > 0) {
        moisRestants = Math.ceil(montantRestant / fluxNetParMois);
        etaDate = new Date();
        etaDate.setMonth(etaDate.getMonth() + moisRestants);
        
        etaLabel = etaDate.toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { month: 'short', year: 'numeric' });
      } else if (montantRestant > 0) {
        etaLabel = t('gps.goalStatus.toDefine');
      } else {
        etaLabel = t('gps.goalStatus.reached');
      }
      
      return {
        ...goal,
        soldeActuel,
        montantCible,
        progression: Math.min(100, Math.max(0, progression)),
        montantRestant,
        moisRestants,
        etaDate,
        etaLabel,
        entreesParMois,
        sortiesParMois,
        fluxNetParMois,
        isWrongDirection,
        isCredit,
        isAchieved,
        goalReachedDayStr,
        goalReachedMonthKey
      };
    });
  }, [financialGoals, initialBalances, baseBudgetEntrees, baseBudgetSorties, accounts, generateDayData, generateMonthData, generateYearData, budgetVersion]);

  // Fonction pour obtenir l'objectif avec la priorité la plus haute
  const getHighestPriorityGoal = useMemo(() => {
    if (!goalsWithProgress || goalsWithProgress.length === 0) return null;
    
    // Ordre de priorité: haute > moyenne > basse
    const priorityOrder = { 'haute': 3, 'moyenne': 2, 'basse': 1 };
    
    // Filtrer les objectifs qui ont une date d'atteinte
    const goalsWithDate = goalsWithProgress.filter(g => g.goalReachedDayStr && !g.isAchieved && !g.isWrongDirection);
    
    if (goalsWithDate.length === 0) return null;
    
    // Trier par priorité (haute d'abord), puis par date (plus proche d'abord)
    const sorted = goalsWithDate.sort((a, b) => {
      const priorityA = priorityOrder[a.priorite] || 2;
      const priorityB = priorityOrder[b.priorite] || 2;
      
      if (priorityB !== priorityA) {
        return priorityB - priorityA; // Haute priorité d'abord
      }
      
      // Même priorité: trier par date (plus proche d'abord)
      return new Date(a.goalReachedDayStr) - new Date(b.goalReachedDayStr);
    });
    
    return sorted[0];
  }, [goalsWithProgress]);

  // Calcul de la position du logo GPS sur la barre de progression
  // Logique: Le logo se déplace progressivement entre les objectifs
  const gpsLogoPosition = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    // Position par défaut: Aujourd'hui (8%)
    if (!currentVisibleDateStr) {
      return { percent: 8, nearGoalId: null, isOnGoal: false };
    }
    
    // Parser la date visible selon le format
    let visibleDate;
    let isCurrentPeriod = false;
    let visibleMonthKey = currentVisibleDateStr.length >= 7 ? currentVisibleDateStr.substring(0, 7) : null;
    
    if (currentVisibleDateStr.length === 10) {
      visibleDate = new Date(currentVisibleDateStr);
      visibleDate.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      isCurrentPeriod = currentVisibleDateStr <= todayStr;
    } else if (currentVisibleDateStr.length === 7) {
      visibleDate = new Date(currentVisibleDateStr + '-15'); // Milieu du mois
      visibleDate.setHours(0, 0, 0, 0);
      isCurrentPeriod = currentVisibleDateStr <= currentMonthKey;
    } else if (currentVisibleDateStr.length === 4) {
      visibleDate = new Date(currentVisibleDateStr + '-07-01');
      visibleDate.setHours(0, 0, 0, 0);
      const currentYear = today.getFullYear().toString();
      isCurrentPeriod = currentVisibleDateStr <= currentYear;
    } else {
      return { percent: 8, nearGoalId: null, isOnGoal: false };
    }
    
    const visibleTime = visibleDate.getTime();
    
    if (isCurrentPeriod) {
      return { percent: 8, nearGoalId: null, isOnGoal: false };
    }
    
    // Récupérer les objectifs triés par date d'atteinte
    const sortedGoals = goalsWithProgress && goalsWithProgress.length > 0
      ? [...goalsWithProgress]
          .filter(g => g.goalReachedDayStr)
          .sort((a, b) => new Date(a.goalReachedDayStr) - new Date(b.goalReachedDayStr))
      : [];
    
    // Date de fin pour le calcul du logo GPS
    // On utilise 2055 ou 10 ans après le dernier objectif (le plus tard des deux)
    // pour que le logo avance de manière perceptible après le dernier objectif
    const lastGoalDate = sortedGoals.length > 0 
      ? new Date(sortedGoals[sortedGoals.length - 1].goalReachedDayStr) 
      : today;
    const tenYearsAfterLastGoal = new Date(lastGoalDate.getFullYear() + 10, 11, 31);
    const year2055 = new Date(2055, 11, 31);
    const endDate = tenYearsAfterLastGoal > year2055 ? tenYearsAfterLastGoal : year2055;
    const endTime = endDate.getTime();
    
    // Construire les waypoints: [Aujourd'hui, Obj1, Obj2, ..., Fin]
    const waypoints = [{ date: today, percent: 8, goalId: null, goal: null }];
    
    sortedGoals.forEach((goal, idx) => {
      const goalDate = new Date(goal.goalReachedDayStr);
      const goalPercent = Math.min(15 + (idx * 20), 85);
      waypoints.push({ date: goalDate, percent: goalPercent, goalId: goal.id, goal });
    });
    
    waypoints.push({ date: endDate, percent: 90, goalId: null, goal: null });
    
    // D'abord, vérifier si on est EXACTEMENT sur un objectif
    for (const wp of waypoints) {
      if (wp.goalId && wp.goal) {
        const goalDateStr = wp.goal.goalReachedDayStr;
        const goalMonthKey = goalDateStr?.substring(0, 7);
        
        const isExactlyOnGoal = 
          currentVisibleDateStr === goalDateStr ||
          (currentVisibleDateStr.length === 7 && currentVisibleDateStr === goalMonthKey);
        
        if (isExactlyOnGoal) {
          return { percent: wp.percent, nearGoalId: wp.goalId, isOnGoal: true };
        }
      }
    }
    
    // Sinon, trouver dans quel segment on se trouve et calculer la progression
    for (let i = 0; i < waypoints.length - 1; i++) {
      const startWp = waypoints[i];
      const endWp = waypoints[i + 1];
      const startTime = startWp.date.getTime();
      const segEndTime = endWp.date.getTime();
      
      // Si on est dans ce segment
      if (visibleTime >= startTime && visibleTime < segEndTime) {
        const segmentRange = segEndTime - startTime;
        const elapsed = visibleTime - startTime;
        const progress = segmentRange > 0 ? elapsed / segmentRange : 0;
        
        const percent = startWp.percent + progress * (endWp.percent - startWp.percent);
        const nearGoalId = (endWp.goalId && progress > 0.9) ? endWp.goalId : null;
        
        return { percent: Math.max(8, Math.min(90, percent)), nearGoalId, isOnGoal: false };
      }
    }
    
    // Si on est après tous les waypoints (ne devrait pas arriver souvent)
    if (visibleTime >= endTime) {
      return { percent: 90, nearGoalId: null, isOnGoal: false };
    }
    
    // Fallback: trouver le dernier objectif dépassé et calculer depuis là
    let lastPassedWpIndex = 0;
    for (let i = 0; i < waypoints.length; i++) {
      if (visibleTime >= waypoints[i].date.getTime()) {
        lastPassedWpIndex = i;
      }
    }
    
    if (lastPassedWpIndex < waypoints.length - 1) {
      const startWp = waypoints[lastPassedWpIndex];
      const endWp = waypoints[lastPassedWpIndex + 1];
      const startTime = startWp.date.getTime();
      const segEndTime = endWp.date.getTime();
      const segmentRange = segEndTime - startTime;
      const elapsed = visibleTime - startTime;
      const progress = segmentRange > 0 ? Math.min(elapsed / segmentRange, 1) : 0;
      
      const percent = startWp.percent + progress * (endWp.percent - startWp.percent);
      return { percent: Math.max(8, Math.min(90, percent)), nearGoalId: null, isOnGoal: false };
    }
    
    return { percent: 8, nearGoalId: null, isOnGoal: false };
  }, [currentVisibleDateStr, generateDayData, goalsWithProgress]);

  const creditLimitAlerts = useMemo(() => {
    const alerts = {};
    
    const creditAccounts = accounts.filter(acc => acc.type === 'credit' && acc.limite);
    
    creditAccounts.forEach(acc => {
      const limite = parseFloat(acc.limite) || 0;
      let limitReachedDate = null;
      let limitReachedDateStr = null;
      let isApproachingLimit = false;
      let daysUntilLimit = null;
      
      for (let i = 0; i < generateDayData.length; i++) {
        const dayData = generateDayData[i];
        const accountData = dayData.accounts[acc.nom];
        
        if (accountData && accountData.solde >= limite) {
          limitReachedDate = dayData.date;
          limitReachedDateStr = dayData.dateStr;
          daysUntilLimit = i;
          isApproachingLimit = true;
          break;
        }
      }
      
      if (!limitReachedDate) {
        for (let i = 0; i < generateMonthData.length; i++) {
          const monthData = generateMonthData[i];
          const accountData = monthData.accounts[acc.nom];
          
          if (accountData && accountData.soldeFin >= limite) {
            limitReachedDate = new Date(monthData.year, monthData.month, 1);
            limitReachedDateStr = monthData.monthKey;
            isApproachingLimit = true;
            break;
          }
        }
      }
      
      const entreesCompte = baseBudgetEntrees.filter(e => e.compte === acc.nom);
      const sortiesCompte = baseBudgetSorties.filter(s => s.compte === acc.nom);
      
      let entreesParMois = 0;
      let sortiesParMois = 0;
      
      entreesCompte.forEach(entree => {
        const montant = parseFloat(entree.montant) || 0;
        switch (entree.frequence) {
          case 'mensuel': entreesParMois += montant; break;
          case 'quinzaine':
          case 'bimensuel': entreesParMois += montant * 2; break;
          case 'hebdomadaire': entreesParMois += montant * 4; break;
          case 'trimestriel': entreesParMois += montant / 3; break;
          case 'semestriel': entreesParMois += montant / 6; break;
          case 'annuel': entreesParMois += montant / 12; break;
          case 'uneFois': case '1-fois': break;
          default: entreesParMois += montant;
        }
      });
      
      sortiesCompte.forEach(sortie => {
        const montant = parseFloat(sortie.montant) || 0;
        switch (sortie.frequence) {
          case 'mensuel': sortiesParMois += montant; break;
          case 'quinzaine':
          case 'bimensuel': sortiesParMois += montant * 2; break;
          case 'hebdomadaire': sortiesParMois += montant * 4; break;
          case 'trimestriel': sortiesParMois += montant / 3; break;
          case 'semestriel': sortiesParMois += montant / 6; break;
          case 'annuel': sortiesParMois += montant / 12; break;
          case 'uneFois': case '1-fois': break;
          default: sortiesParMois += montant;
        }
      });
      
      const isWrongDirection = sortiesParMois > entreesParMois;
      
      const soldeInfo = initialBalances.find(s => s.accountName === acc.nom);
      const soldeActuel = parseFloat(soldeInfo?.solde) || 0;
      
      const percentUsed = limite > 0 ? (soldeActuel / limite) * 100 : 0;
      
      alerts[acc.nom] = {
        accountName: acc.nom,
        limite,
        soldeActuel,
        percentUsed,
        isApproachingLimit,
        isWrongDirection,
        limitReachedDate,
        limitReachedDateStr,
        daysUntilLimit,
        entreesParMois,
        sortiesParMois,
        alertLevel: isApproachingLimit 
          ? (daysUntilLimit !== null && daysUntilLimit <= 30 ? 'critical' : 'warning')
          : (percentUsed >= 80 ? 'caution' : 'ok')
      };
    });
    
    return alerts;
  }, [accounts, generateDayData, generateMonthData, baseBudgetEntrees, baseBudgetSorties, initialBalances, budgetVersion]);

  // Fonction helper pour trouver la prochaine occurrence RÉELLE d'un budget dans generateDayData
  const findNextRealOccurrence = useCallback((budgetDescription, accountName, afterDateStr, dayData) => {
    // Parcourir les jours après afterDateStr pour trouver la prochaine occurrence réelle
    let foundAfter = false;
    
    for (const day of dayData) {
      // On commence à chercher après la date de référence
      if (day.dateStr === afterDateStr) {
        foundAfter = true;
        continue;
      }
      
      if (!foundAfter) continue;
      
      // Chercher dans les entrées de ce jour
      const accountData = day.accounts[accountName];
      if (accountData && accountData.entrees) {
        for (const entree of accountData.entrees) {
          if (entree.description === budgetDescription) {
            return {
              date: day.date,
              dateStr: day.dateStr,
              montant: entree.montant
            };
          }
        }
      }
    }
    
    return null;
  }, []);

  // 💡 Détecter les recommandations de réduction de remboursement
  // Quand un compte crédit atteint 0$ (dette remboursée), proposer de réduire au montant des sorties mensuelles
  const paymentRecommendations = useMemo(() => {
    const recommendations = [];
    
    const creditAccounts = accounts.filter(acc => acc.type === 'credit');
    
    creditAccounts.forEach(creditAcc => {
      // ÉTAPE 1: Trouver quand le compte crédit atteint 0$ ou moins (dette remboursée)
      let creditZeroDate = null;
      let creditZeroDateStr = null;
      
      for (let i = 0; i < allDayData.length; i++) {
        const dayData = allDayData[i];
        const accountData = dayData.accounts[creditAcc.nom];
        
        if (accountData && accountData.solde <= 0) {
          creditZeroDate = dayData.date;
          creditZeroDateStr = dayData.dateStr;
          break;
        }
      }
      
      if (!creditZeroDate) return; // Le crédit ne sera pas remboursé
      
      // ÉTAPE 2: Trouver le DERNIER paiement AVANT que le solde atteigne 0$
      // C'est ce paiement qui a "terminé" le remboursement
      let triggeringBudget = null;
      let triggeringDate = null;
      
      for (let i = 0; i < allDayData.length; i++) {
        const dayData = allDayData[i];
        const accountData = dayData.accounts[creditAcc.nom];
        
        // Arrêter si on dépasse la date où le solde = 0
        if (dayData.dateStr > creditZeroDateStr) break;
        
        // Chercher les entrées (paiements) sur ce compte
        if (accountData && accountData.entrees && accountData.entrees.length > 0) {
          // Prendre l'entrée la plus grosse (probablement le remboursement principal)
          const biggestEntree = accountData.entrees.reduce((max, e) => 
            (parseFloat(e.montant) || 0) > (parseFloat(max.montant) || 0) ? e : max
          , accountData.entrees[0]);
          
          triggeringBudget = biggestEntree;
          triggeringDate = dayData.dateStr;
        }
      }
      
      if (!triggeringBudget) return; // Pas de paiement identifié
      
      // Calculer le total des SORTIES mensuelles de ce compte crédit (dépenses récurrentes)
      const sortiesCredit = baseBudgetSorties.filter(s => s.compte === creditAcc.nom);
      let sortiesMensuelles = 0;
      
      sortiesCredit.forEach(sortie => {
        const montant = parseFloat(sortie.montant) || 0;
        switch (sortie.frequence) {
          case 'mensuel': sortiesMensuelles += montant; break;
          case 'quinzaine':
          case 'bimensuel': sortiesMensuelles += montant * 2; break;
          case 'hebdomadaire': sortiesMensuelles += montant * 4; break;
          case 'trimestriel': sortiesMensuelles += montant / 3; break;
          case 'semestriel': sortiesMensuelles += montant / 6; break;
          case 'annuel': sortiesMensuelles += montant / 12; break;
          case 'uneFois': case '1-fois': break;
          default: sortiesMensuelles += montant;
        }
      });
      
      // Trouver le budget de base correspondant au triggeringBudget
      const remboursementBudget = baseBudgetEntrees.find(e => 
        e.compte === creditAcc.nom && e.description === triggeringBudget.description
      );
      
      if (!remboursementBudget) return;
      
      const montantActuel = parseFloat(triggeringBudget.montant) || 0;
      const nouveauMontant = parseFloat(sortiesMensuelles.toFixed(2));
      
      // Ne recommander que si le remboursement actuel est plus élevé que les sorties mensuelles
      if (montantActuel <= nouveauMontant) return;
      
      // Trouver la PROCHAINE occurrence RÉELLE du budget dans allDayData
      const nextOccurrence = findNextRealOccurrence(
        triggeringBudget.description,
        creditAcc.nom,
        creditZeroDateStr,
        allDayData
      );
      
      if (!nextOccurrence) return; // Pas de prochaine occurrence trouvée
      
      // VÉRIFIER si une modification existe déjà pour ce budget après la date de 0$
      // Si oui, ne pas afficher la recommandation
      const hasExistingModification = budgetModifications && budgetModifications.some(mod => {
        if (mod.dateEffet <= creditZeroDateStr) return false; // Modification avant la date de 0$
        
        // Vérifier si cette modification a changé le budget de remboursement
        const modEntrees = mod.entrees || [];
        const modifiedBudget = modEntrees.find(e => 
          e.description === triggeringBudget.description && e.compte === creditAcc.nom
        );
        
        // Si le montant a été modifié (différent du montant actuel), considérer comme traité
        if (modifiedBudget && parseFloat(modifiedBudget.montant) !== montantActuel) {
          return true;
        }
        return false;
      });
      
      if (hasExistingModification) return; // Déjà traité, ne pas afficher
      
      recommendations.push({
        type: 'reduce_payment',
        creditAccount: creditAcc.nom,
        creditZeroDate,
        creditZeroDateStr,
        remboursementBudget: {
          ...remboursementBudget,
          type: 'entree'
        },
        montantActuel,
        nouveauMontant,
        sortiesMensuelles,
        economie: parseFloat((montantActuel - nouveauMontant).toFixed(2)),
        prochaineDate: nextOccurrence.date,
        prochaineDateStr: nextOccurrence.dateStr,
        // Recommander de changer la fréquence en mensuel
        suggestedFrequence: 'mensuel'
      });
    });
    
    return recommendations;
  }, [accounts, allDayData, baseBudgetEntrees, baseBudgetSorties, budgetModifications, findNextRealOccurrence, budgetVersion]);

  const goalAchievements = useMemo(() => {
    const achievements = {};
    
    goalsWithProgress.forEach(goal => {
      if (!goal.isWrongDirection && (goal.goalReachedDayStr || goal.goalReachedMonthKey)) {
        const accountName = goal.compteAssocie;
        
        if (!achievements[accountName]) {
          achievements[accountName] = [];
        }
        
        achievements[accountName].push({
          goalName: goal.nom,
          goalId: goal.id,
          isCredit: goal.isCredit,
          montantCible: goal.montantCible,
          goalReachedDayStr: goal.goalReachedDayStr,
          goalReachedMonthKey: goal.goalReachedMonthKey,
          isAchieved: goal.isAchieved
        });
      }
    });
    
    return achievements;
  }, [goalsWithProgress, budgetVersion]);

  const animateAccountValue = useCallback((dateStr, accountName, fromValue, toValue) => {
    const duration = 600;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = fromValue + (toValue - fromValue) * easeOut;
      
      setAnimatingAccounts(prev => ({
        ...prev,
        [dateStr]: {
          ...(prev[dateStr] || {}),
          [accountName]: currentValue
        }
      }));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const dateStr = entry.target.dataset.date || entry.target.dataset.month || entry.target.dataset.year;
          if (entry.isIntersecting && !triggeredRows.has(dateStr)) {
            setVisibleRows(prev => new Set([...prev, dateStr]));
            setTriggeredRows(prev => new Set([...prev, dateStr]));
            
            if (viewMode === 'day') {
              const rowData = generateDayData.find(d => d.dateStr === dateStr);
              if (rowData) {
                accounts.forEach(acc => {
                  const accountData = rowData.accounts[acc.nom];
                  if (accountData && accountData.hasActivity) {
                    animateAccountValue(
                      dateStr, 
                      acc.nom, 
                      accountData.soldePrecedent, 
                      accountData.solde
                    );
                  }
                });
                
                if (rowData.hasActivity) {
                  setActiveActivityRows(prev => new Set([...prev, dateStr]));
                  
                  setTimeout(() => {
                    setActiveActivityRows(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(dateStr);
                      return newSet;
                    });
                  }, 1500);
                }
                
                if (rowData.hasTransfers) {
                  setActiveTransferRows(prev => new Set([...prev, dateStr]));
                  
                  setTimeout(() => {
                    setActiveTransferRows(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(dateStr);
                      return newSet;
                    });
                  }, 2000);
                }
              }
            }
            
            if (viewMode === 'month') {
              const monthData = generateMonthData.find(m => m.monthKey === dateStr);
              if (monthData) {
                accounts.forEach(acc => {
                  const accountData = monthData.accounts[acc.nom];
                  if (accountData && accountData.hasActivity) {
                    animateAccountValue(
                      dateStr, 
                      acc.nom, 
                      accountData.soldeDebut, 
                      accountData.soldeFin
                    );
                  }
                });
                
                if (monthData.hasActivity) {
                  setActiveActivityRows(prev => new Set([...prev, dateStr]));
                  
                  setTimeout(() => {
                    setActiveActivityRows(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(dateStr);
                      return newSet;
                    });
                  }, 1500);
                }
              }
            }
            
            if (viewMode === 'year') {
              const yearData = generateYearData.find(y => y.yearKey === dateStr);
              if (yearData) {
                accounts.forEach(acc => {
                  const accountData = yearData.accounts[acc.nom];
                  if (accountData && accountData.hasActivity) {
                    animateAccountValue(
                      dateStr, 
                      acc.nom, 
                      accountData.soldeDebut, 
                      accountData.soldeFin
                    );
                  }
                });
                
                if (yearData.hasActivity) {
                  setActiveActivityRows(prev => new Set([...prev, dateStr]));
                  
                  setTimeout(() => {
                    setActiveActivityRows(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(dateStr);
                      return newSet;
                    });
                  }, 1500);
                }
              }
            }
          }
        });
      },
      { threshold: 0.4, root: scrollContainerRef.current }
    );

    Object.values(rowRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });
    
    if (viewMode === 'month') {
      displayMonthData.forEach(month => {
        const element = document.getElementById(`month-row-${month.monthKey}`);
        if (element) observer.observe(element);
      });
    }
    
    if (viewMode === 'year') {
      displayYearData.forEach(year => {
        const element = document.getElementById(`year-row-${year.yearKey}`);
        if (element) observer.observe(element);
      });
    }

    return () => observer.disconnect();
  }, [displayData, displayMonthData, displayYearData, generateDayData, generateMonthData, generateYearData, accounts, animateAccountValue, triggeredRows, viewMode]);

  const scrollToRow = (index) => {
    setSelectedRowIndex(index);
    const item = generateDayData[index];
    if (item) {
      const element = document.getElementById(`row-${item.dateStr}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const formatMontant = (montant) => {
    if (balancesHidden) return '••••••';
    return new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant);
  };

  const getAccountIcon = (type) => {
    switch (type) {
      case 'credit': return '🏦';
      case 'epargne': return '🌱';
      case 'investissement': return '📈';
      default: return '💳';
    }
  };

  // Helper pour déterminer le signe correct selon le type de compte
  // Pour les comptes crédit: entrée (paiement) = -, sortie (achat) = +
  // Pour les comptes réguliers: entrée = +, sortie = -
  const getTransactionSign = (transactionType, compteName) => {
    const account = accounts.find(a => a.nom === compteName);
    const isCredit = account?.type === 'credit' || account?.type === 'marge' || account?.type === 'hypotheque';
    
    if (isCredit) {
      return transactionType === 'entree' ? '-' : '+';
    }
    return transactionType === 'entree' ? '+' : '-';
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'credit': return t('accounts.types.credit');
      case 'epargne': return t('accounts.types.epargne');
      case 'investissement': return t('accounts.types.investissement');
      case 'cheque': return t('accounts.types.cheque');
      default: return type;
    }
  };

  const navigateToGoal = useCallback((goal) => {
    // Fonction helper pour naviguer et animer selon la vue actuelle
    const navigateWithAnimation = (colorType, popupData) => {
      triggerRecalculation(() => {
        setSkipViewAnimation(true);
        
        // Fonction locale pour afficher l'animation
        const showAnimation = (element) => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const glowClass = colorType === 'red' ? 'goal-glow-red' 
            : colorType === 'blue' ? 'goal-glow-blue' 
            : colorType === 'orange' ? 'goal-glow-orange' 
            : 'goal-glow';
          setTimeout(() => {
            element.classList.add(glowClass);
            setTimeout(() => {
              if (colorType === 'green') element.classList.add('goal-star');
              setTimeout(() => element.classList.remove(glowClass, 'goal-star'), 5000);
            }, 500);
          }, 300);
        };
        
        if (viewMode === 'day') {
          const todayRow = generateDayData.find(day => day.dateStr === todayStr);
          if (todayRow) {
            setSelectedRowIndex(generateDayData.indexOf(todayRow));
            setTimeout(() => {
              const element = document.getElementById(`row-${todayStr}`);
              if (element) {
                showAnimation(element);
                setTimeout(() => setGoalNotReachablePopup(popupData), 1000);
              } else {
                setGoalNotReachablePopup(popupData);
              }
            }, 200);
          } else {
            setGoalNotReachablePopup(popupData);
          }
        } else if (viewMode === 'month') {
          const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
          setSelectedMonthKey(currentMonthKey);
          setTimeout(() => {
            const element = document.getElementById(`month-row-${currentMonthKey}`);
            if (element) {
              showAnimation(element);
              setTimeout(() => setGoalNotReachablePopup(popupData), 1000);
            } else {
              setGoalNotReachablePopup(popupData);
            }
          }, 200);
        } else if (viewMode === 'year') {
          const currentYearKey = String(today.getFullYear());
          setSelectedYearKey(currentYearKey);
          setTimeout(() => {
            const element = document.getElementById(`year-row-${currentYearKey}`);
            if (element) {
              showAnimation(element);
              setTimeout(() => setGoalNotReachablePopup(popupData), 1000);
            } else {
              setGoalNotReachablePopup(popupData);
            }
          }, 200);
        } else {
          setGoalNotReachablePopup(popupData);
        }
      });
    };
    
    if (goal.isAchieved) {
      navigateWithAnimation('green', {
        type: 'achieved',
        goal: goal,
        message: t('gps.goalMessages.achieved', { name: goal.nom })
      });
      return;
    }
    
    if (goal.isWrongDirection) {
      // Naviguer vers le mois/année actuel puis afficher le popup
      if (viewMode === 'month') {
        const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonthKey(currentMonthKey);
        // Attendre que le rendu soit fait
        setTimeout(() => {
          const element = document.getElementById(`month-row-${currentMonthKey}`);
          console.log('Month element:', element, 'monthKey:', currentMonthKey);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          // Afficher le popup après le scroll
          setTimeout(() => {
            setGoalNotReachablePopup({
              type: 'wrong-direction',
              goal: goal,
              message: goal.isCredit 
                ? t('gps.goalMessages.creditNeverReached', { name: goal.nom, expenses: formatMontant(goal.sortiesParMois), income: formatMontant(goal.entreesParMois) })
                : t('gps.goalMessages.savingsNeverReached', { name: goal.nom, expenses: formatMontant(goal.sortiesParMois), income: formatMontant(goal.entreesParMois) })
            });
          }, 600);
        }, 200);
      } else if (viewMode === 'year') {
        const currentYearKey = String(today.getFullYear());
        setSelectedYearKey(currentYearKey);
        setTimeout(() => {
          const element = document.getElementById(`year-row-${currentYearKey}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          setTimeout(() => {
            setGoalNotReachablePopup({
              type: 'wrong-direction',
              goal: goal,
              message: goal.isCredit 
                ? t('gps.goalMessages.creditNeverReached', { name: goal.nom, expenses: formatMontant(goal.sortiesParMois), income: formatMontant(goal.entreesParMois) })
                : t('gps.goalMessages.savingsNeverReached', { name: goal.nom, expenses: formatMontant(goal.sortiesParMois), income: formatMontant(goal.entreesParMois) })
            });
          }, 500);
        }, 100);
      } else {
        // Vue jour - afficher directement le popup
        setGoalNotReachablePopup({
          type: 'wrong-direction',
          goal: goal,
          message: goal.isCredit 
            ? t('gps.goalMessages.creditNeverReached', { name: goal.nom, expenses: formatMontant(goal.sortiesParMois), income: formatMontant(goal.entreesParMois) })
            : t('gps.goalMessages.savingsNeverReached', { name: goal.nom, expenses: formatMontant(goal.sortiesParMois), income: formatMontant(goal.entreesParMois) })
        });
      }
      return;
    }
    
    if (!goal.etaDate || goal.fluxNetParMois <= 0) {
      // Naviguer vers le mois/année actuel puis afficher le popup
      if (viewMode === 'month') {
        const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonthKey(currentMonthKey);
        setTimeout(() => {
          const element = document.getElementById(`month-row-${currentMonthKey}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          setTimeout(() => {
            setGoalNotReachablePopup({
              type: 'no-budget',
              goal: goal,
              message: t(goal.isCredit ? 'gps.goalMessages.noBudgetCredit' : 'gps.goalMessages.noBudgetSavings', { name: goal.nom })
            });
          }, 500);
        }, 100);
      } else if (viewMode === 'year') {
        const currentYearKey = String(today.getFullYear());
        setSelectedYearKey(currentYearKey);
        setTimeout(() => {
          const element = document.getElementById(`year-row-${currentYearKey}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          setTimeout(() => {
            setGoalNotReachablePopup({
              type: 'no-budget',
              goal: goal,
              message: t(goal.isCredit ? 'gps.goalMessages.noBudgetCredit' : 'gps.goalMessages.noBudgetSavings', { name: goal.nom })
            });
          }, 500);
        }, 100);
      } else {
        // Vue jour - afficher directement le popup
        setGoalNotReachablePopup({
          type: 'no-budget',
          goal: goal,
          message: t(goal.isCredit ? 'gps.goalMessages.noBudgetCredit' : 'gps.goalMessages.noBudgetSavings', { name: goal.nom })
        });
      }
      return;
    }
    
    const targetAccountName = goal.compteAssocie;
    const targetAmount = goal.montantCible;
    const isCredit = goal.isCredit;
    
    const isGoalReached = (solde) => {
      if (isCredit) {
        return solde <= targetAmount;
      } else {
        return solde >= targetAmount;
      }
    };
    
    // Fonction pour afficher l'animation d'objectif après scroll
    const showGoalAnimation = (element, colorType = 'green') => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      const glowClass = colorType === 'red' ? 'goal-glow-red' : colorType === 'blue' ? 'goal-glow-blue' : 'goal-glow';
      
      setTimeout(() => {
        element.classList.add(glowClass);
        
        setTimeout(() => {
          if (colorType === 'green') {
            element.classList.add('goal-star');
          }
          
          setTimeout(() => {
            element.classList.remove(glowClass, 'goal-star');
          }, 5000);
        }, 500);
      }, 600);
    };
    
    const dayMatch = generateDayData.find(day => {
      const accountData = day.accounts[targetAccountName];
      if (accountData) {
        return isGoalReached(accountData.solde);
      }
      return false;
    });
    
    if (dayMatch) {
      // D'ABORD: Animation GPS "Calcul de l'itinéraire..."
      triggerRecalculation(() => {
        // ENSUITE: Changer de vue et afficher l'animation d'objectif
        setSkipViewAnimation(true); // Skip le loader de changement de vue
        setViewMode('day');
        setSelectedRowIndex(generateDayData.indexOf(dayMatch));
        
        setTimeout(() => {
          const element = document.getElementById(`row-${dayMatch.dateStr}`);
          if (element) {
            showGoalAnimation(element);
          }
        }, 200);
      });
      return;
    }
    
    const monthMatch = generateMonthData.find(month => {
      const accountData = month.accounts[targetAccountName];
      if (accountData) {
        return isGoalReached(accountData.soldeFin);
      }
      return false;
    });
    
    if (monthMatch) {
      // 🔒 Si plan Discovery, vérifier si l'objectif est dans la plage des jours disponibles
      if (!canAccessGpsView('month')) {
        // Vérifier si le premier jour du mois cible existe dans generateDayData (vue jour actuelle)
        const dayInRange = generateDayData.find(day => day.monthKey === monthMatch.monthKey);
        if (dayInRange) {
          // L'objectif est dans la plage → naviguer vers vue JOUR
          triggerRecalculation(() => {
            setSkipViewAnimation(true);
            setViewMode('day');
            setSelectedRowIndex(generateDayData.indexOf(dayInRange));
            
            setTimeout(() => {
              const element = document.getElementById(`row-${dayInRange.dateStr}`);
              if (element) {
                showGoalAnimation(element);
              }
            }, 200);
          });
        } else {
          // L'objectif est hors de la plage → popup de restriction
          setUpgradeModal({ isOpen: true, type: 'gpsMonth' });
        }
        return;
      }
      // D'ABORD: Animation GPS "Calcul de l'itinéraire..."
      triggerRecalculation(() => {
        // ENSUITE: Changer de vue et afficher l'animation d'objectif
        setSkipViewAnimation(true); // Skip le loader de changement de vue
        setViewMode('month');
        setSelectedMonthKey(monthMatch.monthKey);
        
        setTimeout(() => {
          const element = document.getElementById(`month-row-${monthMatch.monthKey}`);
          if (element) {
            showGoalAnimation(element);
          }
        }, 200);
      });
      return;
    }
    
    const yearMatch = generateYearData.find(year => {
      const accountData = year.accounts[targetAccountName];
      if (accountData) {
        return isGoalReached(accountData.soldeFin);
      }
      return false;
    });
    
    if (yearMatch) {
      // 🔒 Si plan Discovery, vérifier si l'objectif est dans la plage des jours disponibles
      if (!canAccessGpsView('year')) {
        // Vérifier si un jour de cette année existe dans generateDayData (vue jour actuelle)
        const dayInRange = generateDayData.find(day => day.yearKey === yearMatch.yearKey);
        if (dayInRange) {
          // L'objectif est dans la plage → naviguer vers vue JOUR
          triggerRecalculation(() => {
            setSkipViewAnimation(true);
            setViewMode('day');
            setSelectedRowIndex(generateDayData.indexOf(dayInRange));
            
            setTimeout(() => {
              const element = document.getElementById(`row-${dayInRange.dateStr}`);
              if (element) {
                showGoalAnimation(element);
              }
            }, 200);
          });
        } else {
          // L'objectif est hors de la plage → popup de restriction
          setUpgradeModal({ isOpen: true, type: 'gpsYear' });
        }
        return;
      }
      // D'ABORD: Animation GPS "Calcul de l'itinéraire..."
      triggerRecalculation(() => {
        // ENSUITE: Changer de vue et afficher l'animation d'objectif
        setSkipViewAnimation(true); // Skip le loader de changement de vue
        setViewMode('year');
        setSelectedYearKey(yearMatch.yearKey);
        
        setTimeout(() => {
          const element = document.getElementById(`year-row-${yearMatch.yearKey}`);
          if (element) {
            showGoalAnimation(element);
          }
        }, 200);
      });
      return;
    }
    
    setGoalNotReachablePopup({
      type: 'too-far',
      goal: goal,
      message: t('gps.goalMessages.tooFar', { name: goal.nom, eta: goal.etaLabel })
    });
    
  }, [generateDayData, generateMonthData, generateYearData, formatMontant, triggerRecalculation, viewMode, todayStr, t, canAccessGpsView]);

  // ============================================
  // MODE NAVIGATION - Hooks au niveau supérieur (React rules)
  // IMPORTANT: Ces hooks DOIVENT être AVANT tout early return (if isLoading)
  // pour éviter "Rendered more hooks than during the previous render"
  // ============================================
  const navigationDays = useMemo(() => {
    return displayData.filter(day => day.hasActivity || day.isToday);
  }, [displayData]);
  
  const visibleDays = useMemo(() => {
    return navigationDays.slice(navIndex, navIndex + 8);
  }, [navigationDays, navIndex]);
  
  const currentDay = navigationDays[navIndex] || navigationDays[0];
  
  // 🆕 Calcul de la prochaine activité (pour l'indicateur de navigation)
  const nextActivity = useMemo(() => {
    if (!navigationDays || navigationDays.length === 0 || !accounts) return null;
    
    // Date réelle d'aujourd'hui (pour calculer l'intervalle)
    const realToday = new Date();
    const todayYear = realToday.getFullYear();
    const todayMonth = realToday.getMonth();
    const todayDay = realToday.getDate();
    const todayDate = new Date(todayYear, todayMonth, todayDay);
    
    // Chercher la prochaine journée avec activité APRÈS la position actuelle dans le calendrier
    for (let i = navIndex + 1; i < navigationDays.length && i < navIndex + 365; i++) {
      const day = navigationDays[i];
      if (!day || !day.dateStr) continue;
      
      let dayEntrees = [];
      let daySorties = [];
      
      accounts.forEach(acc => {
        const accData = day.accounts?.[acc.nom];
        if (accData) {
          if (accData.entrees && accData.entrees.length > 0) {
            accData.entrees.forEach(e => dayEntrees.push({ ...e, compte: acc.nom }));
          }
          if (accData.sorties && accData.sorties.length > 0) {
            accData.sorties.forEach(s => daySorties.push({ ...s, compte: acc.nom }));
          }
        }
      });
      
      if (dayEntrees.length > 0 || daySorties.length > 0) {
        // Calculer l'intervalle depuis la DATE RÉELLE d'aujourd'hui (pas la position)
        const [nextYear, nextMonth, nextDay] = day.dateStr.split('-').map(Number);
        const nextDate = new Date(nextYear, nextMonth - 1, nextDay);
        const diffTime = nextDate.getTime() - todayDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          dateStr: day.dateStr,
          label: day.label,
          daysAway: diffDays,
          countEntrees: dayEntrees.length,
          countSorties: daySorties.length,
          // 🔗 Filtrer les entrées liées (transferts internes) pour le vrai total
          totalEntrees: dayEntrees.filter(e => !linkedEntreeDescriptions.has(e.description)).reduce((sum, e) => sum + e.montant, 0),
          totalSorties: daySorties.reduce((sum, s) => sum + s.montant, 0),
          entrees: dayEntrees,
          sorties: daySorties
        };
      }
    }
    return null;
  }, [navigationDays, navIndex, accounts, linkedEntreeDescriptions]);
  
  // 🔄 Ref pour synchronisation Navigation depuis URL
  const hasInitializedNavFromUrl = useRef(false);

  // Navigation Mois - Liste des mois pour le scroll
  const navigationMonths = useMemo(() => {
    return displayMonthData.filter(month => month.hasActivity || month.isCurrentMonth);
  }, [displayMonthData]);
  
  const visibleMonths = useMemo(() => {
    return navigationMonths.slice(navMonthIndex, navMonthIndex + 4);
  }, [navigationMonths, navMonthIndex]);
  
  const currentNavMonth = navigationMonths[navMonthIndex] || navigationMonths[0];

  // 🆕 Traiter le mois en attente de navigation (depuis Dashboard)
  useEffect(() => {
    if (pendingCalendarNavMonth && navigationMonths && navigationMonths.length > 0) {
      const targetIndex = navigationMonths.findIndex(m => m.monthKey === pendingCalendarNavMonth);
      console.log('[GPS] Traitement pendingCalendarNavMonth:', pendingCalendarNavMonth, 'index:', targetIndex);
      if (targetIndex !== -1) {
        setNavMonthIndex(targetIndex);
      }
      // Reset après traitement
      setPendingCalendarNavMonth(null);
    }
  }, [pendingCalendarNavMonth, navigationMonths]);

  // Navigation Année - Liste des années pour le scroll
  const navigationYears = useMemo(() => {
    return displayYearData.filter(year => year.hasActivity || year.isCurrentYear);
  }, [displayYearData]);
  
  const visibleYears = useMemo(() => {
    return navigationYears.slice(navYearIndex, navYearIndex + 4);
  }, [navigationYears, navYearIndex]);
  
  const currentNavYear = navigationYears[navYearIndex] || navigationYears[0];

  // 🔄 Synchroniser Navigation avec le paramètre date et view de l'URL
  useEffect(() => {
    if (navigationMode && !hasInitializedNavFromUrl.current && navigationDays.length > 0) {
      const dateParam = searchParams.get('date');
      const viewParam = searchParams.get('view');
      
      if (dateParam || viewParam) {
        // Pour la vue mois, attendre que navigationMonths soit prêt
        if (viewParam === 'month' && (!navigationMonths || navigationMonths.length === 0)) {
          return; // Attendre le prochain render
        }
        // Pour la vue année, attendre que navigationYears soit prêt
        if (viewParam === 'year' && (!navigationYears || navigationYears.length === 0)) {
          return; // Attendre le prochain render
        }
        
        hasInitializedNavFromUrl.current = true;
        
        // Synchroniser la vue si spécifiée
        if (viewParam && ['day', 'month', 'year'].includes(viewParam)) {
          // 🔒 Vérifier les restrictions d'abonnement
          if (viewParam === 'month' && !canAccessGpsView('month')) {
            console.log('[GPS] Vue month bloquée - plan Discovery');
            setPerspectiveView('day'); // Fallback vers jour
            setUpgradeModal({ isOpen: true, type: 'gpsMonth' });
          } else if (viewParam === 'year' && !canAccessGpsView('year')) {
            console.log('[GPS] Vue year bloquée - plan Discovery');
            setPerspectiveView('day'); // Fallback vers jour
            setUpgradeModal({ isOpen: true, type: 'gpsYear' });
          } else {
            console.log('[GPS] Setting perspectiveView to:', viewParam);
            setPerspectiveView(viewParam);
          }
        }
        
        if (dateParam) {
          // Extraire année et mois de la date
          const dateParts = dateParam.split('-');
          const targetYear = parseInt(dateParts[0]);
          const targetMonth = parseInt(dateParts[1]) - 1; // 0-indexed
          
          if (viewParam === 'year') {
            // Synchroniser l'index de l'année
            const yearIndex = navigationYears?.findIndex(y => y.year === targetYear);
            console.log('[GPS] Year navigation - targetYear:', targetYear, 'yearIndex:', yearIndex);
            if (yearIndex !== -1) {
              setNavYearIndex(yearIndex);
            }
          } else if (viewParam === 'month') {
            // Synchroniser l'index du mois
            const monthIndex = navigationMonths?.findIndex(m => m.year === targetYear && m.month === targetMonth);
            console.log('[GPS] Month navigation - targetYear:', targetYear, 'targetMonth:', targetMonth, 'monthIndex:', monthIndex);
            if (monthIndex !== -1) {
              setNavMonthIndex(monthIndex);
            }
          } else {
            // Vue jour - comportement existant
            const targetIndex = navigationDays.findIndex(d => d.dateStr === dateParam);
            if (targetIndex !== -1) {
              setNavIndex(targetIndex);
            }
          }
        }
      }
    }
    // Reset quand on quitte Navigation
    if (!navigationMode) {
      hasInitializedNavFromUrl.current = false;
    }
  }, [navigationMode, searchParams, navigationDays, navigationMonths, navigationYears, canAccessGpsView]);


  // Animation des montants en Navigation (style machine à compter)
  const animateNavAccountValue = useCallback((accountName, fromValue, toValue) => {
    const duration = 600;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = fromValue + (toValue - fromValue) * easeOut;
      
      setNavAnimatingAccounts(prev => ({
        ...prev,
        [accountName]: currentValue
      }));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation terminée, nettoyer
        setNavAnimatingAccounts(prev => {
          const newState = { ...prev };
          delete newState[accountName];
          return newState;
        });
      }
    };
    
    requestAnimationFrame(animate);
  }, []);

  // Déclencher animation quand navIndex change
  useEffect(() => {
    if (!currentDay || !accounts.length) return;
    
    accounts.forEach(acc => {
      const newSolde = currentDay.accounts?.[acc.nom]?.solde || 0;
      const prevSolde = prevNavSoldes.current[acc.nom];
      
      // Si on a une valeur précédente et qu'elle diffère, animer
      if (prevSolde !== undefined && Math.abs(newSolde - prevSolde) > 0.01) {
        animateNavAccountValue(acc.nom, prevSolde, newSolde);
      }
      
      // Stocker le nouveau solde comme précédent
      prevNavSoldes.current[acc.nom] = newSolde;
    });
  }, [navIndex, currentDay, accounts, animateNavAccountValue]);

  // 📱 MOBILE: L'auto-éclatement des bulles est géré directement dans le rendu
  // via la condition (isMobile && currentDay?.dateStr === group.dateStr)

  // MODE NAVIGATION - Helper functions (niveau supérieur)
  const calculateDaysFromCurrent = useCallback((dateStr) => {
    if (!dateStr || !currentDay) return 0;
    const targetDate = new Date(dateStr);
    const currentDate = new Date(currentDay.dateStr);
    const diffTime = targetDate - currentDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [currentDay]);
  
  const formatDelay = useCallback((days) => {
    if (days === 0) return t('gps.navigation.todayLabel');
    if (days === 1) return t('gps.navigation.tomorrowLabel');
    return t('gps.navigation.inDaysLabel', { count: days });
  }, [t]);
  
  const getTransactionsByType = useCallback((day) => {
    if (!day) return { entrees: [], sorties: [] };
    const entrees = [];
    const sorties = [];
    accounts.forEach(acc => {
      const accData = day.accounts[acc.nom];
      if (accData) {
        accData.entrees.forEach(tr => entrees.push({ ...tr, compte: acc.nom }));
        accData.sorties.forEach(tr => sorties.push({ ...tr, compte: acc.nom }));
      }
    });
    return { entrees, sorties };
  }, [accounts]);
  
  // MODE NAVIGATION - Hooks useMemo (niveau supérieur - React rules)
  const trajectoryResult = useMemo(() => {
    if (!currentDay) return 0;
    let total = 0;
    accounts.forEach(acc => {
      const accData = currentDay.accounts[acc.nom];
      if (accData) {
        const isCredit = acc.type === 'credit' || acc.type === 'hypotheque' || acc.type === 'marge';
        total += isCredit ? -accData.solde : accData.solde;
      }
    });
    return total;
  }, [currentDay, accounts]);
  
  // Bulles futures - INVERSÉES: Entrées à DROITE, Sorties à GAUCHE
  const bubbles = useMemo(() => {
    const result = [];
    
    visibleDays.forEach((day, idx) => {
      if (idx === 0) return;
      
      const { entrees, sorties } = getTransactionsByType(day);
      const daysAway = calculateDaysFromCurrent(day.dateStr);
      
      const yPercent = 75 - (idx * 8);
      const baseScale = 1 - (idx * 0.1);
      const xOffset = 35 + (idx * 2);
      
      // 🟢 v12: ENTRÉES - Viennent de l'horizon (haut centre) vers bas-droite
      if (entrees.length > 0) {
        const totalEntrees = entrees.reduce((sum, t) => sum + t.montant, 0);
        const sizeBonus = Math.min(entrees.length * 5, 20);
        
        const maxIdx = 7;
        const normalizedIdx = Math.min(idx, maxIdx);
        const yPos = 20 + (normalizedIdx * 8);
        const xPos = 52 + (normalizedIdx * 3);
        const bubbleScale = 0.3 + (normalizedIdx * 0.1);
        
        result.push({
          id: `entry-${day.dateStr}`,
          type: 'entree',
          side: 'right',
          day: day,
          dayLabel: day.label,
          daysAway: daysAway,
          transactions: entrees,
          total: totalEntrees,
          count: entrees.length,
          yPercent: yPos,
          xPercent: xPos,
          scale: bubbleScale,
          sizeBonus: sizeBonus,
          opacity: 0.3 + (bubbleScale * 0.7),
          idx: idx
        });
      }
    });
    
    return result;
  }, [visibleDays, currentDay, getTransactionsByType, calculateDaysFromCurrent]);
  
  // Bulles du jour actuel - INVERSÉES aussi
  const todayBubbles = useMemo(() => {
    if (!currentDay) return [];
    const { entrees, sorties } = getTransactionsByType(currentDay);
    const result = [];
    
    if (confirmedToday) {
      const allTransactions = [
        ...entrees.map(t => ({ ...t, type: 'entree' })),
        ...sorties.map(t => ({ ...t, type: 'sortie' }))
      ];
      
      const angleStep = (Math.PI * 0.8) / Math.max(allTransactions.length - 1, 1);
      const startAngle = Math.PI * 0.6;
      
      allTransactions.forEach((tx, i) => {
        const angle = startAngle + (i * angleStep);
        const radius = 180 + (i % 2) * 40;
        const x = 50 + Math.cos(angle) * (radius / 10);
        const y = 25 + Math.sin(angle) * (radius / 8);
        
        result.push({
          id: `today-${tx.type}-${i}`,
          type: tx.type,
          description: tx.description,
          montant: tx.montant,
          compte: tx.compte,
          x: x,
          y: y,
          size: 60 + (tx.montant / 100)
        });
      });
    } else {
      // Mode aligné - INVERSÉ: Entrées à DROITE, Sorties à GAUCHE
      entrees.forEach((tx, i) => {
        result.push({
          id: `today-entree-${i}`,
          type: 'entree',
          description: tx.description,
          montant: tx.montant,
          compte: tx.compte,
          x: 58 + (i * 8),
          y: 75 + (i * 5),
          size: 70 + (tx.montant / 50)
        });
      });
    }
    
    return result;
  }, [currentDay, confirmedToday, getTransactionsByType]);

  // ===========================================
  // DÉTECTION DU PREMIER DÉCOUVERT - Multi-vues (Jour/Mois/Année)
  // ===========================================
  const firstOverdraft = useMemo(() => {
    if (!accounts || accounts.length === 0) return null;
    
    // Vue JOUR - Chercher dans navigationDays
    if (perspectiveView === 'day') {
      for (let i = 0; i < navigationDays.length; i++) {
        const day = navigationDays[i];
        for (const acc of accounts) {
          if (acc.type === 'credit' || acc.type === 'hypotheque' || acc.type === 'marge') continue;
          const accountData = day.accounts?.[acc.nom];
          if (accountData && accountData.solde < 0) {
            return {
              globalIndex: i,
              dateStr: day.dateStr,
              dayLabel: day.label,
              accountName: acc.nom,
              amount: accountData.solde,
              viewType: 'day'
            };
          }
        }
      }
    }
    
    // Vue MOIS - Chercher dans navigationMonths
    if (perspectiveView === 'month' && typeof navigationMonths !== 'undefined') {
      for (let i = 0; i < navigationMonths.length; i++) {
        const month = navigationMonths[i];
        for (const acc of accounts) {
          if (acc.type === 'credit' || acc.type === 'hypotheque' || acc.type === 'marge') continue;
          const accountData = month.accounts?.[acc.nom];
          if (accountData && accountData.soldeFin < 0) {
            return {
              globalIndex: i,
              dateStr: month.monthKey,
              dayLabel: month.label,
              accountName: acc.nom,
              amount: accountData.soldeFin,
              viewType: 'month'
            };
          }
        }
      }
    }
    
    // Vue ANNÉE - Chercher dans navigationYears
    if (perspectiveView === 'year' && typeof navigationYears !== 'undefined') {
      for (let i = 0; i < navigationYears.length; i++) {
        const year = navigationYears[i];
        for (const acc of accounts) {
          if (acc.type === 'credit' || acc.type === 'hypotheque' || acc.type === 'marge') continue;
          const accountData = year.accounts?.[acc.nom];
          if (accountData && accountData.soldeFin < 0) {
            return {
              globalIndex: i,
              dateStr: year.yearKey,
              dayLabel: year.label,
              accountName: acc.nom,
              amount: accountData.soldeFin,
              viewType: 'year'
            };
          }
        }
      }
    }
    
    return null;
  }, [accounts, navigationDays, navigationMonths, navigationYears, perspectiveView]);

  // Visibilité du découvert dans la fenêtre actuelle
  const overdraftVisibility = useMemo(() => {
    if (!firstOverdraft) return { isVisible: false };
    
    const windowSize = 4;
    let currentIndex, maxIndex;
    
    if (perspectiveView === 'day') {
      currentIndex = navIndex;
      maxIndex = navIndex + windowSize;
    } else if (perspectiveView === 'month') {
      currentIndex = typeof navMonthIndex !== 'undefined' ? navMonthIndex : 0;
      maxIndex = currentIndex + windowSize;
    } else {
      currentIndex = typeof navYearIndex !== 'undefined' ? navYearIndex : 0;
      maxIndex = currentIndex + windowSize;
    }
    
    const isVisible = firstOverdraft.globalIndex >= currentIndex && firstOverdraft.globalIndex < maxIndex;
    
    return { isVisible };
  }, [firstOverdraft, perspectiveView, navIndex, navMonthIndex, navYearIndex]);

  // ===========================================
  // DÉTECTION DE LA PREMIÈRE LIMITE DE CRÉDIT ATTEINTE
  // ===========================================
  const firstCreditLimit = useMemo(() => {
    if (!accounts || accounts.length === 0) return null;
    
    // Comptes de type crédit avec limite
    const creditAccounts = accounts.filter(acc => 
      (acc.type === 'credit' || acc.type === 'marge') && acc.limite && acc.limite > 0
    );
    
    if (creditAccounts.length === 0) {
      return null;
    }
    
    // Vue JOUR
    if (perspectiveView === 'day') {
      for (let i = 0; i < navigationDays.length; i++) {
        const day = navigationDays[i];
        for (const acc of creditAccounts) {
          const accountData = day.accounts?.[acc.nom];
          if (accountData && accountData.solde >= acc.limite) {
            return {
              globalIndex: i,
              dateStr: day.dateStr,
              dayLabel: day.label,
              accountName: acc.nom,
              solde: accountData.solde,
              limite: acc.limite,
              viewType: 'day'
            };
          }
        }
      }
    }
    
    // Vue MOIS
    if (perspectiveView === 'month' && typeof navigationMonths !== 'undefined') {
      for (let i = 0; i < navigationMonths.length; i++) {
        const month = navigationMonths[i];
        for (const acc of creditAccounts) {
          const accountData = month.accounts?.[acc.nom];
          if (accountData && accountData.soldeFin >= acc.limite) {
            return {
              globalIndex: i,
              dateStr: month.monthKey,
              dayLabel: month.label,
              accountName: acc.nom,
              solde: accountData.soldeFin,
              limite: acc.limite,
              viewType: 'month'
            };
          }
        }
      }
    }
    
    // Vue ANNÉE
    if (perspectiveView === 'year' && typeof navigationYears !== 'undefined') {
      for (let i = 0; i < navigationYears.length; i++) {
        const year = navigationYears[i];
        for (const acc of creditAccounts) {
          const accountData = year.accounts?.[acc.nom];
          if (accountData && accountData.soldeFin >= acc.limite) {
            return {
              globalIndex: i,
              dateStr: year.yearKey,
              dayLabel: year.label,
              accountName: acc.nom,
              solde: accountData.soldeFin,
              limite: acc.limite,
              viewType: 'year'
            };
          }
        }
      }
    }
    
    return null;
  }, [accounts, navigationDays, perspectiveView]);

  // 🆕 Détection de TOUTES les limites de crédit atteintes (pour gérer plusieurs comptes)
  const allCreditLimits = useMemo(() => {
    if (!accounts || accounts.length === 0) return {};
    
    const creditAccounts = accounts.filter(acc => 
      (acc.type === 'credit' || acc.type === 'marge') && acc.limite && acc.limite > 0
    );
    
    if (creditAccounts.length === 0) return {};
    
    const limits = {};
    
    // Vue JOUR
    if (perspectiveView === 'day') {
      for (const acc of creditAccounts) {
        for (let i = 0; i < navigationDays.length; i++) {
          const day = navigationDays[i];
          const accountData = day.accounts?.[acc.nom];
          if (accountData && accountData.solde >= acc.limite) {
            limits[acc.nom] = {
              globalIndex: i,
              dateStr: day.dateStr,
              dayLabel: day.label,
              accountName: acc.nom,
              solde: accountData.solde,
              limite: acc.limite,
              viewType: 'day'
            };
            break; // Première occurrence pour ce compte
          }
        }
      }
    }
    
    return limits;
  }, [accounts, navigationDays, perspectiveView]);

  // Visibilité de la limite de crédit dans la fenêtre actuelle
  const creditLimitVisibility = useMemo(() => {
    if (!firstCreditLimit) return { isVisible: false };
    
    const windowSize = 4;
    let currentIndex, maxIndex;
    
    if (perspectiveView === 'day') {
      currentIndex = navIndex;
      maxIndex = navIndex + windowSize;
    } else if (perspectiveView === 'month') {
      currentIndex = typeof navMonthIndex !== 'undefined' ? navMonthIndex : 0;
      maxIndex = currentIndex + windowSize;
    } else {
      currentIndex = typeof navYearIndex !== 'undefined' ? navYearIndex : 0;
      maxIndex = currentIndex + windowSize;
    }
    
    const isVisible = firstCreditLimit.globalIndex >= currentIndex && firstCreditLimit.globalIndex < maxIndex;
    
    return { isVisible };
  }, [firstCreditLimit, perspectiveView, navIndex]);

  // ===========================================
  // DÉTECTION DES OBJECTIFS ATTEINTS (Navigation)
  // ===========================================
  
  // 🎯 TOUS les objectifs à atteindre avec leur position
  const allGoalsReached = useMemo(() => {
    if (!goalAchievements || Object.keys(goalAchievements).length === 0) return [];
    
    const result = [];
    
    Object.entries(goalAchievements).forEach(([accountName, goals]) => {
      goals.forEach(goal => {
        if (goal.goalReachedDayStr && !goal.isAchieved) {
          // Extraire le mois (YYYY-MM) de la date d'objectif
          const goalMonthKey = goal.goalReachedDayStr.slice(0, 7);
          const goalYear = goal.goalReachedDayStr.slice(0, 4);
          
          if (perspectiveView === 'day' && navigationDays && navigationDays.length > 0) {
            // Vue JOUR - Trouver le jour exact ou le premier jour après
            const dayIndex = navigationDays.findIndex(d => d.dateStr >= goal.goalReachedDayStr);
            
            // Si -1, l'objectif est après toutes les dates disponibles -> NE PAS AFFICHER
            if (dayIndex === -1) return;
            
            // Vérifier que c'est bien le bon jour (ou très proche)
            const day = navigationDays[dayIndex];
            if (day && day.dateStr === goal.goalReachedDayStr) {
              result.push({
                globalIndex: dayIndex,
                dateStr: goal.goalReachedDayStr,
                displayDateStr: day.dateStr,
                dayLabel: day.label,
                accountName,
                goalName: goal.goalName,
                montantCible: goal.montantCible,
                isCredit: goal.isCredit,
                viewType: 'day'
              });
            }
          } else if (perspectiveView === 'month' && navigationMonths && navigationMonths.length > 0) {
            // Vue MOIS - Trouver le mois exact
            const monthIndex = navigationMonths.findIndex(m => m.monthKey === goalMonthKey);
            
            // Si -1, le mois n'existe pas dans la navigation -> NE PAS AFFICHER
            if (monthIndex === -1) return;
            
            const month = navigationMonths[monthIndex];
            if (month) {
              result.push({
                globalIndex: monthIndex,
                dateStr: goal.goalReachedDayStr,
                displayDateStr: month.monthKey,
                dayLabel: month.label,
                accountName,
                goalName: goal.goalName,
                montantCible: goal.montantCible,
                isCredit: goal.isCredit,
                viewType: 'month'
              });
            }
          } else if (perspectiveView === 'year' && navigationYears && navigationYears.length > 0) {
            // Vue ANNÉE - Trouver l'année exacte
            const yearIndex = navigationYears.findIndex(y => y.yearKey === goalYear);
            
            // Si -1, l'année n'existe pas dans la navigation -> NE PAS AFFICHER
            if (yearIndex === -1) return;
            
            const year = navigationYears[yearIndex];
            if (year) {
              result.push({
                globalIndex: yearIndex,
                dateStr: goal.goalReachedDayStr,
                displayDateStr: year.yearKey,
                dayLabel: year.label,
                accountName,
                goalName: goal.goalName,
                montantCible: goal.montantCible,
                isCredit: goal.isCredit,
                viewType: 'year'
              });
            }
          }
        }
      });
    });
    
    // Trier par date
    result.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    
    return result;
  }, [goalAchievements, perspectiveView, navigationDays, navigationMonths, navigationYears]);
  
  // Premier objectif atteint (pour la bulle sur la route)
  const firstGoalReached = useMemo(() => {
    if (allGoalsReached.length === 0) return null;
    return allGoalsReached[0];
  }, [allGoalsReached]);

  // Visibilité de l'objectif atteint dans la fenêtre actuelle
  const goalReachedVisibility = useMemo(() => {
    if (!firstGoalReached) return { isVisible: false };
    
    const windowSize = 4;
    let currentIndex;
    
    if (perspectiveView === 'day') {
      currentIndex = navIndex;
    } else if (perspectiveView === 'month') {
      currentIndex = navMonthIndex;
    } else {
      currentIndex = navYearIndex;
    }
    
    const maxIndex = currentIndex + windowSize;
    const isVisible = firstGoalReached.globalIndex >= currentIndex && firstGoalReached.globalIndex < maxIndex;
    
    return { isVisible };
  }, [firstGoalReached, perspectiveView, navIndex, navMonthIndex, navYearIndex]);
  
  // Visibilité pour CHAQUE objectif (pour les indicateurs sur les comptes)
  const getGoalVisibility = useCallback((accountName) => {
    const goal = allGoalsReached.find(g => g.accountName === accountName);
    if (!goal) return { hasGoal: false, isVisible: false, goal: null };
    
    const windowSize = 4;
    let currentIndex;
    
    if (perspectiveView === 'day') {
      currentIndex = navIndex;
    } else if (perspectiveView === 'month') {
      currentIndex = navMonthIndex;
    } else {
      currentIndex = navYearIndex;
    }
    
    const maxIndex = currentIndex + windowSize;
    const isVisible = goal.globalIndex >= currentIndex && goal.globalIndex < maxIndex;
    
    return { hasGoal: true, isVisible, goal };
  }, [allGoalsReached, perspectiveView, navIndex, navMonthIndex, navYearIndex]);

  // ===========================================
  // DÉTECTION DES OBJECTIFS EN MAUVAISE DIRECTION
  // ===========================================
  
  // ⛔ TOUS les objectifs en mauvaise direction (sorties >= entrées)
  const allWrongDirections = useMemo(() => {
    if (!goalsWithProgress || goalsWithProgress.length === 0) return [];
    
    return goalsWithProgress
      .filter(g => g.isWrongDirection && !g.isAchieved)
      .map(goal => ({
        accountName: goal.compteAssocie,
        goalName: goal.nom,
        montantCible: goal.montantCible,
        soldeActuel: goal.soldeActuel,
        progression: goal.progression,
        entreesParMois: goal.entreesParMois,
        sortiesParMois: goal.sortiesParMois,
        isCredit: goal.isCredit,
        montantRestant: goal.montantRestant
      }));
  }, [goalsWithProgress]);
  
  // Vérifier si un compte a un objectif en mauvaise direction
  const getWrongDirectionForAccount = useCallback((accountName) => {
    return allWrongDirections.find(g => g.accountName === accountName) || null;
  }, [allWrongDirections]);

  // Réinitialiser les alertes de mauvaise direction ignorées quand le budget change
  useEffect(() => {
    if (budgetVersion > 0) {
      setDismissedWrongDirections(new Set());
    }
  }, [budgetVersion]);

  // ===========================================
  // TÉLÉPORTATION - Scroll automatique vers un index
  // Défilement naturel des bulles comme un scroll rapide
  // ===========================================
  
  // Synchroniser les refs avec les states (pour téléportation)
  useEffect(() => { navIndexRef.current = navIndex; }, [navIndex]);
  useEffect(() => { navMonthIndexRef.current = navMonthIndex; }, [navMonthIndex]);
  useEffect(() => { navYearIndexRef.current = navYearIndex; }, [navYearIndex]);
  
  const teleportToIndex = useCallback((targetIndex, callback, viewType = 'day') => {
    console.log('[TELEPORT] ========== DÉMARRAGE ==========');
    console.log('[TELEPORT] targetIndex:', targetIndex, 'viewType:', viewType);
    console.log('[TELEPORT] Refs actuelles - day:', navIndexRef.current, 'month:', navMonthIndexRef.current, 'year:', navYearIndexRef.current);
    
    // Déterminer quel setter et index utiliser selon la vue (utiliser les refs!)
    let getCurrentIndex, setIndex, maxLength;
    if (viewType === 'year') {
      getCurrentIndex = () => navYearIndexRef.current;
      setIndex = (val) => {
        console.log('[TELEPORT] setNavYearIndex ->', val);
        setNavYearIndex(val);
      };
      maxLength = navigationYears?.length || 0;
    } else if (viewType === 'month') {
      getCurrentIndex = () => navMonthIndexRef.current;
      setIndex = (val) => {
        console.log('[TELEPORT] setNavMonthIndex ->', val);
        setNavMonthIndex(val);
      };
      maxLength = navigationMonths?.length || 0;
    } else {
      getCurrentIndex = () => navIndexRef.current;
      setIndex = (val) => {
        console.log('[TELEPORT] setNavIndex ->', val);
        setNavIndex(val);
      };
      maxLength = navigationDays?.length || 0;
    }
    
    const startIndex = getCurrentIndex();
    console.log('[TELEPORT] Position actuelle:', startIndex, 'Cible:', targetIndex, 'Max:', maxLength);
    
    // Vérifier que l'index cible est valide
    if (targetIndex < 0 || targetIndex >= maxLength) {
      console.warn('[TELEPORT] Index cible invalide:', targetIndex, 'max:', maxLength);
      if (callback) callback();
      return;
    }
    
    // Si déjà à destination, exécuter le callback directement
    if (startIndex === targetIndex) {
      console.log('[TELEPORT] Déjà à destination');
      if (callback) setTimeout(callback, 200);
      return;
    }
    
    // Nettoyer tout intervalle existant
    if (teleportIntervalRef.current) {
      clearInterval(teleportIntervalRef.current);
    }
    
    // Démarrer la téléportation
    setIsTeleporting(true);
    
    // Calculer la direction
    const direction = targetIndex > startIndex ? 1 : -1;
    
    // Utiliser une variable locale pour tracker la position
    let currentPosition = startIndex;
    
    console.log('[TELEPORT] Direction:', direction > 0 ? 'AVANT' : 'ARRIÈRE', 'Distance:', Math.abs(targetIndex - startIndex), 'steps');
    
    // Démarrer le défilement automatique (20ms par step = rapide!)
    teleportIntervalRef.current = setInterval(() => {
      currentPosition += direction;
      
      // Mettre à jour l'affichage
      setIndex(currentPosition);
      
      // Mettre à jour la ref aussi pour suivre la position
      if (viewType === 'year') navYearIndexRef.current = currentPosition;
      else if (viewType === 'month') navMonthIndexRef.current = currentPosition;
      else navIndexRef.current = currentPosition;
      
      // Vérifier si on a atteint la destination
      if (currentPosition === targetIndex) {
        console.log('[TELEPORT] ✅ ARRIVÉ à destination:', currentPosition);
        // Arrêter l'intervalle
        clearInterval(teleportIntervalRef.current);
        teleportIntervalRef.current = null;
        setIsTeleporting(false);
        
        // Exécuter le callback après un court délai
        if (callback) setTimeout(callback, 300);
      }
    }, 20); // 20ms par step = défilement rapide
  }, [navigationDays?.length, navigationMonths?.length, navigationYears?.length]);
  
  // Cleanup de l'intervalle au démontage
  useEffect(() => {
    return () => {
      if (teleportIntervalRef.current) {
        clearInterval(teleportIntervalRef.current);
      }
    };
  }, []);

  // Fonction pour changer de vue avec animation de téléportation
  const changeViewWithAnimation = useCallback((targetView) => {
    if (isViewTransitioning || perspectiveView === targetView) return;
    
    // 🔒 Vérifier les restrictions d'abonnement
    if (targetView === 'month' && !canAccessGpsView('month')) {
      setUpgradeModal({ isOpen: true, type: 'gpsMonth' });
      return;
    }
    if (targetView === 'year' && !canAccessGpsView('year')) {
      setUpgradeModal({ isOpen: true, type: 'gpsYear' });
      return;
    }
    
    // Déterminer la direction: Day→Month→Year = recul (out), Year→Month→Day = avance (in)
    const viewOrder = { 'day': 0, 'month': 1, 'year': 2 };
    const direction = viewOrder[targetView] > viewOrder[perspectiveView] ? 'out' : 'in';
    
    console.log('[VIEW TRANSITION] De', perspectiveView, 'vers', targetView, '- Direction:', direction);
    
    // Démarrer l'animation de sortie
    setViewTransitionDirection(direction);
    setIsViewTransitioning(true);
    
    // Après l'animation de sortie, changer la vue
    setTimeout(() => {
      setPerspectiveView(targetView);
      
      // Après le changement, terminer l'animation
      setTimeout(() => {
        setIsViewTransitioning(false);
      }, 400);
    }, 300);
  }, [perspectiveView, isViewTransitioning, canAccessGpsView]);

  // Composant Loader GPS réutilisable
  const GPSLoader = ({ message }) => (
    <div style={{ 
      textAlign: 'center', 
      padding: '35px 50px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #040449 0%, #100261 100%)',
      borderRadius: '20px',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 200,
      boxShadow: '0 20px 60px rgba(4, 4, 73, 0.6)'
    }}>
      {/* Cercle GPS animé avec boussole centrée */}
      <div style={{ 
        position: 'relative', 
        width: '70px', 
        height: '70px', 
        marginBottom: '15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          position: 'absolute',
          width: '70px',
          height: '70px',
          border: '4px solid rgba(255, 255, 255, 0.2)',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          animation: 'gps-spin 0.8s linear infinite',
          boxSizing: 'border-box'
        }} />
        <div style={{
          position: 'absolute',
          width: '50px',
          height: '50px',
          border: '3px solid rgba(255, 255, 255, 0.15)',
          borderBottom: '3px solid #764ba2',
          borderRadius: '50%',
          animation: 'gps-spin 1.2s linear infinite reverse',
          boxSizing: 'border-box'
        }} />
        {/* Boussole centrée */}
        <span style={{
          fontSize: '1.5em',
          animation: 'gps-pulse 0.8s ease-in-out infinite',
          zIndex: 10
        }}>
          🧭
        </span>
      </div>
      
      <p style={{ 
        color: 'white', 
        fontSize: '0.95em',
        fontWeight: '600',
        margin: 0,
        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
      }}>
        📍 {message || t('gps.loading')}
      </p>
    </div>
  );

  if (isLoading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        background: whatIfMode === 'foundations' 
          ? 'linear-gradient(135deg, #2e1a0a 0%, #3e2a16 100%)'
          : whatIfMode === 'smartRoute'
            ? 'linear-gradient(135deg, #1a1a2e 0%, #2e1a3e 100%)'
            : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '20px'
      }}>
        <style>{`
          @keyframes gps-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes gps-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          @keyframes modal-zoom-in {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.1) perspective(500px) rotateX(30deg);
            }
            60% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1.1) perspective(500px) rotateX(-5deg);
            }
            100% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1) perspective(500px) rotateX(0deg);
            }
          }
          @keyframes backdrop-fade {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          /* Scrollbar moderne - Entrées (bleu) */
          .modal-scroll-entree::-webkit-scrollbar {
            width: 8px !important;
          }
          .modal-scroll-entree::-webkit-scrollbar-track {
            background: rgba(52, 152, 219, 0.2) !important;
            border-radius: 4px !important;
          }
          .modal-scroll-entree::-webkit-scrollbar-thumb {
            background: #3498db !important;
            border-radius: 4px !important;
          }
          .modal-scroll-entree::-webkit-scrollbar-thumb:hover {
            background: #2980b9 !important;
          }
          /* Scrollbar moderne - Sorties (orange) */
          .modal-scroll-sortie::-webkit-scrollbar {
            width: 8px !important;
          }
          .modal-scroll-sortie::-webkit-scrollbar-track {
            background: rgba(255, 152, 0, 0.2) !important;
            border-radius: 4px !important;
          }
          .modal-scroll-sortie::-webkit-scrollbar-thumb {
            background: #ff9800 !important;
            border-radius: 4px !important;
          }
          .modal-scroll-sortie::-webkit-scrollbar-thumb:hover {
            background: #f57c00 !important;
          }
          @keyframes count-up {
            0% { 
              transform: translateY(0) scale(1); 
              filter: blur(0px);
            }
            15% { 
              transform: translateY(-4px) scale(1.05); 
              filter: blur(1px);
            }
            30% { 
              transform: translateY(3px) scale(1.03); 
              filter: blur(0.5px);
            }
            45% { 
              transform: translateY(-2px) scale(1.02); 
              filter: blur(0.3px);
            }
            60% { 
              transform: translateY(1px) scale(1.01); 
              filter: blur(0px);
            }
            75% { 
              transform: translateY(-1px) scale(1); 
            }
            100% { 
              transform: translateY(0) scale(1); 
              filter: blur(0px);
            }
          }
          .montant-counting {
            animation: count-up 0.6s ease-out;
          }
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.3); }
          }
          @keyframes account-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
          @keyframes montant-change {
            0% { transform: scale(1); }
            25% { transform: scale(1.1); color: #fff; }
            50% { transform: scale(1.15); }
            100% { transform: scale(1); }
          }
          .account-pulse {
            animation: account-pulse 2s ease-in-out infinite;
          }
          @keyframes gps-ring-spin {
            0% {
              transform: rotate(0deg);
              box-shadow: 0 0 10px rgba(255, 165, 0, 0.5);
            }
            50% {
              box-shadow: 0 0 20px rgba(255, 165, 0, 0.8), 0 0 30px rgba(255, 69, 0, 0.4);
            }
            100% {
              transform: rotate(360deg);
              box-shadow: 0 0 10px rgba(255, 165, 0, 0.5);
            }
          }
        `}</style>
        
        {/* Cercle GPS animé */}
        <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '25px' }}>
          <div style={{
            position: 'absolute',
            width: '100px',
            height: '100px',
            border: '4px solid rgba(102, 126, 234, 0.2)',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'gps-spin 1s linear infinite'
          }} />
          <div style={{
            position: 'absolute',
            top: '15px',
            left: '15px',
            width: '70px',
            height: '70px',
            border: '3px solid rgba(118, 75, 162, 0.2)',
            borderBottom: '3px solid #764ba2',
            borderRadius: '50%',
            animation: 'gps-spin 1.5s linear infinite reverse'
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '2em',
            animation: 'gps-pulse 1s ease-in-out infinite'
          }}>
            🧭
          </div>
        </div>
        )}
        
        <p style={{ 
          color: 'white', 
          fontSize: '1.1em',
          fontWeight: '600',
          margin: '0 0 8px'
        }}>
          📍 {t('gps.recalculation.calculating')}
        </p>
        <p style={{ 
          color: 'rgba(255,255,255,0.6)', 
          fontSize: '0.85em',
          margin: 0
        }}>
          {t('gps.loading')}
        </p>
      </div>
    );
  }


  // ============================================
  // MODE NAVIGATION - GPS Financier v12
  // Route en perspective 3D
  // Entrées à DROITE, Sorties à GAUCHE
  // ============================================
  console.log('[GPSFinancier] 🚦 Checking navigationMode before render:', navigationMode);
  if (navigationMode) {
    
    const handleWheel = (e) => {
      // Bloquer le scroll si un modal est ouvert
      if (selectedBubble) return;
      
      // Bloquer le scroll si pas en mode plein écran
      if (!isFullScreen) return;
      
      e.preventDefault();
      
      // Gérer le scroll selon la vue active
      if (perspectiveView === 'year') {
        if (e.deltaY > 0) {
          setNavYearIndex(prev => Math.min(prev + 1, navigationYears.length - 1));
        } else {
          setNavYearIndex(prev => Math.max(prev - 1, 0));
        }
      } else if (perspectiveView === 'month') {
        if (e.deltaY > 0) {
          setNavMonthIndex(prev => Math.min(prev + 1, navigationMonths.length - 1));
        } else {
          setNavMonthIndex(prev => Math.max(prev - 1, 0));
        }
      } else {
        // Vue Jour (par défaut)
        if (e.deltaY > 0) {
          setNavIndex(prev => Math.min(prev + 1, navigationDays.length - 1));
        } else {
          setNavIndex(prev => Math.max(prev - 1, 0));
        }
      }
    };
    
    // 📱 Handler touch pour scroll mobile (swipe vertical)
    const touchThreshold = 50; // Pixels minimum pour déclencher le scroll
    
    const handleTouchStart = (e) => {
      touchStartYRef.current = e.touches[0].clientY;
    };
    
    const handleTouchEnd = (e) => {
      // Bloquer si un modal est ouvert ou pas en fullscreen
      if (selectedBubble || !isFullScreen) return;
      
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartYRef.current - touchEndY;
      
      // Swipe vers le BAS (deltaY < 0) = AVANCER dans le futur
      // Swipe vers le HAUT (deltaY > 0) = RECULER vers le passé
      if (Math.abs(deltaY) > touchThreshold) {
        if (perspectiveView === 'year') {
          if (deltaY < 0) {
            // Swipe DOWN = avancer
            setNavYearIndex(prev => Math.min(prev + 1, navigationYears.length - 1));
          } else {
            // Swipe UP = reculer
            setNavYearIndex(prev => Math.max(prev - 1, 0));
          }
        } else if (perspectiveView === 'month') {
          if (deltaY < 0) {
            setNavMonthIndex(prev => Math.min(prev + 1, navigationMonths.length - 1));
          } else {
            setNavMonthIndex(prev => Math.max(prev - 1, 0));
          }
        } else {
          // Vue Jour (par défaut)
          if (deltaY < 0) {
            setNavIndex(prev => Math.min(prev + 1, navigationDays.length - 1));
          } else {
            setNavIndex(prev => Math.max(prev - 1, 0));
          }
        }
      }
    };
    
    // 🔒 Sécurité: Vérifier qu'on est bien sur la page GPS pour le fullscreen
    const isOnGpsPage = location.pathname.startsWith('/gps');
    const shouldApplyFullScreen = isFullScreen && isOnGpsPage;
    
    return (
      <div 
        data-tooltip="gps-welcome"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          height: shouldApplyFullScreen ? '100vh' : '100%', 
          background: whatIfMode === 'foundations' 
          ? 'linear-gradient(180deg, #0a1f0a 0%, #0d2818 100%)'
          : whatIfMode === 'smartRoute'
            ? 'linear-gradient(180deg, #001a1f 0%, #002830 100%)'
            : (isDark ? 'linear-gradient(180deg, #040449 0%, #100261 100%)' : '#ffffff'),
          transition: 'background 0.8s ease-in-out',
          overflow: 'hidden',
          position: 'relative',
          ...(shouldApplyFullScreen ? {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          } : {})
        }}
      >
        {/* Overlay transparent pour capturer tous les clics en mode normal */}
        {/* Caché pendant le tooltip tour et le guide pour permettre l'interaction */}
        {!isFullScreen && !isTooltipActive && !showGuide && !showContinueBar && (
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
        <style>{`
          @keyframes gps-ring-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes float-bubble {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          @keyframes pulse-logo {
            0%, 100% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.5); }
            50% { box-shadow: 0 0 50px rgba(255, 215, 0, 0.8); }
          }
          @keyframes drop-in {
            0% {
              opacity: 0;
              transform: translate(-50%, -80%) scale(0.8);
            }
            60% {
              opacity: 1;
              transform: translate(-50%, -45%) scale(1.02);
            }
            80% {
              transform: translate(-50%, -52%) scale(0.98);
            }
            100% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }
          @keyframes radialExpand {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.3);
            }
            50% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1.1);
            }
            100% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }
          @keyframes view-transition-out {
            0% {
              opacity: 1;
              transform: scale(1) translateZ(0);
            }
            50% {
              opacity: 0.3;
              transform: scale(0.7) translateZ(-200px);
            }
            100% {
              opacity: 0;
              transform: scale(0.3) translateZ(-500px);
            }
          }
          @keyframes view-transition-in {
            0% {
              opacity: 0;
              transform: scale(2) translateZ(500px);
            }
            50% {
              opacity: 0.5;
              transform: scale(1.2) translateZ(100px);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateZ(0);
            }
          }
          .view-transition-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle at center, transparent 0%, #040449 70%, #100261 100%);
            z-index: 9998;
            pointer-events: none;
          }
          .view-transition-overlay.out {
            animation: warp-overlay-out 0.6s ease-in-out forwards;
          }
          .view-transition-overlay.in {
            animation: warp-overlay-in 0.6s ease-in-out forwards;
          }
          @keyframes warp-overlay-out {
            0% {
              opacity: 0;
              background: radial-gradient(circle at center, transparent 0%, rgba(4,4,73,0) 100%);
            }
            50% {
              opacity: 1;
              background: radial-gradient(circle at center, rgba(255,215,0,0.3) 0%, rgba(4,4,73,0.9) 50%, #100261 100%);
            }
            100% {
              opacity: 1;
              background: radial-gradient(circle at center, rgba(255,215,0,0.5) 0%, #040449 40%, #100261 100%);
            }
          }
          @keyframes warp-overlay-in {
            0% {
              opacity: 1;
              background: radial-gradient(circle at center, rgba(255,215,0,0.5) 0%, #040449 40%, #100261 100%);
            }
            50% {
              opacity: 0.5;
              background: radial-gradient(circle at center, rgba(255,215,0,0.2) 0%, rgba(4,4,73,0.5) 100%);
            }
            100% {
              opacity: 0;
              background: radial-gradient(circle at center, transparent 0%, rgba(4,4,73,0) 100%);
            }
          }
          @keyframes star-warp-out {
            0% {
              transform: scale(1) translate(0, 0);
              opacity: 0;
            }
            30% {
              opacity: 1;
            }
            100% {
              transform: scale(0.1) translate(calc(50vw - 50%), calc(50vh - 50%));
              opacity: 0;
            }
          }
          @keyframes star-warp-in {
            0% {
              transform: scale(0.1) translate(calc(50vw - 50%), calc(50vh - 50%));
              opacity: 0;
            }
            30% {
              opacity: 1;
            }
            100% {
              transform: scale(1) translate(0, 0);
              opacity: 0;
            }
          }
          @keyframes pulse-text {
            0% {
              transform: scale(0.5);
              opacity: 0;
            }
            50% {
              transform: scale(1.2);
              opacity: 1;
            }
            100% {
              transform: scale(1);
              opacity: 0;
            }
          }
          .bubble {
            position: absolute;
            cursor: pointer;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            animation: float-bubble 4s ease-in-out infinite;
          }
          .bubble-drop {
            animation: drop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, float-bubble 4s ease-in-out 0.6s infinite;
          }
          .bubble:hover {
            filter: brightness(1.2);
            transform: scale(1.1);
            z-index: 100 !important;
          }
          .bubble-entry {
            background: radial-gradient(circle at 30% 30%, rgba(52, 152, 219, 0.95), rgba(41, 128, 185, 0.85));
            border: 2px solid #3498db;
          }
          .bubble-expense {
            background: radial-gradient(circle at 30% 30%, rgba(255, 152, 0, 0.95), rgba(230, 126, 0, 0.85));
            border: 2px solid #ff9800;
          }
          @keyframes route-optimization-glow {
            0% { 
              opacity: 0;
              box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
            }
            50% { 
              opacity: 1;
              box-shadow: 0 0 60px rgba(255, 215, 0, 0.8), 0 0 100px rgba(255, 140, 0, 0.6);
            }
            100% { 
              opacity: 0;
              box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
            }
          }
          @keyframes route-glow-pulse {
            0%, 100% { 
              transform: scaleX(1);
              opacity: 0.3;
            }
            50% { 
              transform: scaleX(1.5);
              opacity: 0.8;
            }
          }
          @keyframes route-sparkle {
            0% { 
              transform: translateY(0) scale(0);
              opacity: 0;
            }
            20% {
              transform: translateY(-20px) scale(1);
              opacity: 1;
            }
            100% { 
              transform: translateY(-100px) scale(0);
              opacity: 0;
            }
          }
        `}</style>
        
        {/* 📱 PWA Safe Area - Zone pour l'encoche/heure système */}
        {isMobile && isPWA && shouldApplyFullScreen && (
          <div style={{
            height: 'env(safe-area-inset-top, 0px)',
            background: whatIfMode === 'foundations' 
              ? '#0a1f0a'
              : whatIfMode === 'smartRoute'
                ? '#001a1f'
                : (isDark ? '#040449' : '#ffffff'),
            width: '100%',
            flexShrink: 0,
            position: 'relative',
            zIndex: 10000
          }} />
        )}
        
        {/* OVERLAY ANIMATION CHANGEMENT DE VUE */}
        {isViewTransitioning && (
          <div 
            className={`view-transition-overlay ${viewTransitionDirection}`}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Étoiles de téléportation */}
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: '#ffd700',
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `star-warp-${viewTransitionDirection} 0.6s ease-${viewTransitionDirection === 'out' ? 'in' : 'out'} ${i * 0.02}s forwards`,
                  boxShadow: '0 0 6px rgba(255, 215, 0, 0.8)'
                }}
              />
            ))}
          </div>
        )}
        
        {/* HEADER SUPPRIMÉ - éléments déplacés en bas */}
        
        {/* ZONE DE CONDUITE */}
        <div 
          style={{ 
          flex: 1, 
          position: 'relative',
          overflow: 'hidden'
        }}>
          
          {/* 🆕 HEADER EN HAUT À DROITE - Titre du mode + Boutons (CACHÉ SUR MOBILE) */}
          {!isMobile && (
          <div 
            data-tooltip="pilot-modes"
            style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            zIndex: 100
          }}>
            {/* Titre du mode */}
            <div style={{
              padding: '8px 16px',
              borderRadius: '20px',
              background: whatIfMode === 'foundations' 
                ? 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)'
                : whatIfMode === 'smartRoute'
                  ? 'linear-gradient(135deg, #00bcd4 0%, #0097a7 100%)'
                  : 'linear-gradient(135deg, #040449 0%, #100261 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9em',
              fontWeight: 'bold',
              boxShadow: whatIfMode === 'foundations'
                ? '0 4px 20px rgba(46, 204, 113, 0.5)'
                : whatIfMode === 'smartRoute'
                  ? '0 4px 20px rgba(0, 188, 212, 0.5)'
                  : '0 4px 20px rgba(4, 4, 73, 0.5)',
              border: '2px solid rgba(255,255,255,0.3)'
            }}>
              {whatIfMode === 'foundations' ? '⚓' : whatIfMode === 'smartRoute' ? '⭐' : '🧭'}
              {whatIfMode === 'foundations' 
                ? t('gps.foundations.title', 'Les Fondations') 
                : whatIfMode === 'smartRoute'
                  ? t('gps.smartRoute.title', 'Smart Route')
                  : t('gps.pilotAuto.title', 'Pilote Auto')}
            </div>
            
            {/* Boutons de navigation entre modes */}
            {!whatIfMode ? (
              // Mode Pilote Auto: boutons vers Fondations et Smart Route
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/gps/fondations?fullscreen=true');
                  }}
                  title={t('gps.foundations.buttonTitle', 'Les Fondations - Budgets fixes')}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(46, 204, 113, 0.4) 0%, rgba(39, 174, 96, 0.4) 100%)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    fontSize: '1.1em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 15px rgba(46, 204, 113, 0.3)',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(46, 204, 113, 0.7) 0%, rgba(39, 174, 96, 0.7) 100%)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(46, 204, 113, 0.4) 0%, rgba(39, 174, 96, 0.4) 100%)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ⚓
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/gps/smart-route?fullscreen=true');
                  }}
                  title={t('gps.smartRoute.buttonTitle', 'Smart Route - Fixes + Semi-fixes')}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.4) 0%, rgba(0, 151, 167, 0.4) 100%)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    fontSize: '1.1em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 15px rgba(0, 188, 212, 0.3)',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 188, 212, 0.7) 0%, rgba(0, 151, 167, 0.7) 100%)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 188, 212, 0.4) 0%, rgba(0, 151, 167, 0.4) 100%)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ⭐
                </button>
              </>
            ) : (
              // Modes Fondations/Smart Route: bouton retour Pilote Auto
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/gps?fullscreen=true');
                }}
                title={t('gps.backToPilotAuto', 'Retour à Pilote Auto')}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(4, 4, 73, 0.4) 0%, rgba(16, 2, 97, 0.4) 100%)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  fontSize: '1.1em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(4, 4, 73, 0.3)',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(4, 4, 73, 0.7) 0%, rgba(16, 2, 97, 0.7) 100%)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(4, 4, 73, 0.4) 0%, rgba(16, 2, 97, 0.4) 100%)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                🧭
              </button>
            )}
          </div>
          )}
          
          {/* 🆕 BOUTONS ŒIL ET FERMER - En haut à droite */}
          <div style={{
            position: 'absolute',
            top: isMobile ? '15px' : '70px',
            right: '15px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            zIndex: 100
          }}>
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                if (showGuide || showContinueBar) return;
                toggleBalances(e); 
              }}
              disabled={showGuide || showContinueBar}
              title="Masquer/Afficher les soldes"
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: balancesHidden 
                  ? 'rgba(255,165,0,0.6)' 
                  : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)'),
                border: 'none', 
                color: isDark ? 'white' : '#1e293b', 
                cursor: (showGuide || showContinueBar) ? 'not-allowed' : 'pointer', 
                opacity: (showGuide || showContinueBar) ? 0.5 : 1,
                fontSize: '1.1em',
                boxShadow: isDark ? '0 4px 15px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.1)'
              }}
            >{balancesHidden ? '👁️‍🗨️' : '👁️'}</button>
            
            {isFullScreen && !whatIfMode && (
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (isMobile) {
                    // 📱 Mobile: Ouvrir le sidebar
                    window.dispatchEvent(new Event('openSidebar'));
                  } else {
                    setIsFullScreen(false); 
                  }
                }}
                title={t('gps.actions.exitFullscreen')}
                style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'transparent', 
                  border: isDark ? '2px solid rgba(255,255,255,0.4)' : '2px solid rgba(0,0,0,0.2)',
                  color: isDark ? 'white' : '#1e293b', 
                  cursor: 'pointer', 
                  fontSize: '1.1em',
                  boxShadow: isDark ? '0 0 15px rgba(255,255,255,0.1)' : '0 0 15px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)';
                }}
              >✕</button>
            )}
          </div>
          
          {/* 🆕 INDICATEUR DE NAVIGATION - Titre + Prochaine activité */}
          <div style={{
            position: 'absolute',
            top: isMobile ? '35%' : '90px',
            left: '15px',
            zIndex: 100,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? '2px' : '12px'
          }}>
            {/* Titre Navigation + Intervalle */}
            <div 
              style={{
              color: isDark ? 'rgba(255,255,255,0.9)' : '#667eea',
              fontSize: isMobile ? '1em' : '1.3em',
              fontWeight: 'bold',
              fontStyle: 'italic',
              textShadow: isDark ? '0 2px 10px rgba(0,0,0,0.5)' : 'none',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: isMobile ? '2px' : '8px'
            }}>
              <span>{t('gps.navigation.title')}</span>
              {nextActivity && (
                <span style={{ color: '#ffd700', fontSize: isMobile ? '0.75em' : '0.7em' }}>
                  {isMobile ? '' : '- '}{nextActivity.daysAway === 0 
                    ? t('gps.navigation.todayLabel')
                    : nextActivity.daysAway === 1 
                      ? t('gps.navigation.tomorrowLabel')
                      : nextActivity.daysAway < 30
                        ? t('gps.navigation.inDays', { count: nextActivity.daysAway })
                        : nextActivity.daysAway < 365
                          ? (nextActivity.daysAway % 30 > 0 
                              ? t('gps.navigation.inMonthsAndDays', { months: Math.floor(nextActivity.daysAway / 30), days: nextActivity.daysAway % 30 })
                              : t('gps.navigation.inMonths', { months: Math.floor(nextActivity.daysAway / 30) }))
                          : (() => {
                              const years = Math.floor(nextActivity.daysAway / 365);
                              const months = Math.floor((nextActivity.daysAway % 365) / 30);
                              if (months > 0) {
                                return years > 1 
                                  ? t('gps.navigation.inYearsPluralAndMonths', { years, months })
                                  : t('gps.navigation.inYearsAndMonths', { years, months });
                              }
                              return years > 1 
                                ? t('gps.navigation.inYearsPlural', { years })
                                : t('gps.navigation.inYears', { years });
                            })()}
                </span>
              )}
            </div>
            
            {/* Bulles de la prochaine activité - Caché sur mobile */}
            {nextActivity && !isMobile && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {nextActivity.countEntrees > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#3498db',
                      boxShadow: '0 0 8px rgba(52, 152, 219, 0.6)'
                    }} />
                    <span style={{ color: '#3498db', fontSize: '0.9em', fontWeight: 'bold' }}>
                      {nextActivity.countEntrees}
                    </span>
                  </div>
                )}
                {nextActivity.countSorties > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#ff9800',
                      boxShadow: '0 0 8px rgba(255, 152, 0, 0.6)'
                    }} />
                    <span style={{ color: '#ff9800', fontSize: '0.9em', fontWeight: 'bold' }}>
                      {nextActivity.countSorties}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* CONTRÔLES EN HAUT À GAUCHE */}
          <div 
            style={{
            position: 'absolute',
            top: '15px',
            left: '15px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            zIndex: 100
          }}>
            {/* Badge Transactions du jour 📅 - dans Navigation */}
            {showTransactionBadge && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTodayTransactionsPopup(todayTransactionsData);
                }}
                title={t('gps.transactions.badge', 'Transactions du jour')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85em',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  animation: 'pulse-alert 2s ease-in-out infinite'
                }}
              >
                📅 {todayTransactionsData?.transactions?.length || 0}
              </button>
            )}
            
            {/* Badge Optimisation ♻️ - dans Navigation */}
            {!showTransactionBadge && showOptimizationBadge && !userData?.optimizationRequest?.requested && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptimizationPopup(true);
                }}
                title={t('budget.optimization.title', 'Optimisations')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #00bcd4 0%, #0097a7 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85em',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 15px rgba(0, 188, 212, 0.4)',
                  animation: 'pulse-alert 2s ease-in-out infinite'
                }}
              >
                ♻️ {optimizedCount}
              </button>
            )}
            
            {/* Badge PL4TO 📊 - TOUJOURS visible sauf si demande en cours */}
            {!userData?.optimizationRequest?.requested && (
              <button
                data-tooltip="plato-button"
                onClick={(e) => {
                  e.stopPropagation();
                  // ✅ Bloquer pendant le guide
                  if (showGuide || showContinueBar) return;
                  setShowPL4TORequestModal(true);
                }}
                disabled={showGuide || showContinueBar}
                title={t('gps.pl4toRequest.title', 'Améliorer votre parcours')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                  color: 'white',
                  cursor: (showGuide || showContinueBar) ? 'not-allowed' : 'pointer',
                  opacity: (showGuide || showContinueBar) ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85em',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 15px rgba(52, 152, 219, 0.4)'
                }}
              >
                📊 PL4TO
              </button>
            )}
          </div>
          
          {/* TEXTE NAVIGATION EN COLONNE VERTICALE À GAUCHE */}
          <div style={{
            display: 'none', // MASQUÉ - Déplacé en haut à gauche
            position: 'absolute',
            left: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 100,
            alignItems: 'center'
          }}>
            <span style={{ 
              color: 'transparent', 
              fontSize: '1.4em', 
              fontWeight: 'bold', 
              textShadow: whatIfMode === 'foundations' 
                ? '0 0 10px rgba(46, 204, 113, 0.5), 0 2px 4px rgba(0,0,0,0.3)' 
                : whatIfMode === 'smartRoute'
                  ? '0 0 10px rgba(0, 188, 212, 0.5), 0 2px 4px rgba(0,0,0,0.3)'
                  : '0 0 10px rgba(4, 4, 73, 0.5), 0 2px 4px rgba(0,0,0,0.3)',
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              letterSpacing: '2px'
            }}>
              {whatIfMode === 'foundations' 
                ? t('gps.foundations.title', 'Les Fondations') 
                : whatIfMode === 'smartRoute'
                  ? t('gps.smartRoute.title', 'Smart Route')
                  : t('gps.pilotAuto.title', 'Pilote Auto')}
            </span>
            
            {/* 🆕 Boutons de navigation entre modes */}
            {!whatIfMode ? (
              // Mode Pilote Auto: 2 boutons vers les autres modes
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/gps/fondations?fullscreen=true');
                  }}
                  title={t('gps.foundations.buttonTitle', 'Les Fondations - Budgets fixes')}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(46, 204, 113, 0.4) 0%, rgba(39, 174, 96, 0.4) 100%)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    fontSize: '1.3em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 15px rgba(46, 204, 113, 0.3)',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(46, 204, 113, 0.7) 0%, rgba(39, 174, 96, 0.7) 100%)';
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(46, 204, 113, 0.6)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(46, 204, 113, 0.4) 0%, rgba(39, 174, 96, 0.4) 100%)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(46, 204, 113, 0.3)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ⚓
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/gps/smart-route?fullscreen=true');
                  }}
                  title={t('gps.smartRoute.buttonTitle', 'Smart Route - Fixes + Semi-fixes')}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.4) 0%, rgba(0, 151, 167, 0.4) 100%)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    fontSize: '1.3em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 15px rgba(0, 188, 212, 0.3)',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 188, 212, 0.7) 0%, rgba(0, 151, 167, 0.7) 100%)';
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 188, 212, 0.6)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 188, 212, 0.4) 0%, rgba(0, 151, 167, 0.4) 100%)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 188, 212, 0.3)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ⭐
                </button>
              </>
            ) : (
              // Modes Fondations/Smart Route: bouton retour
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/gps?fullscreen=true');
                }}
                title={t('gps.backToPilotAuto', 'Retour à Pilote Auto')}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(52, 152, 219, 0.4) 0%, rgba(41, 128, 185, 0.4) 100%)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  fontSize: '1.3em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(52, 152, 219, 0.3)',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(52, 152, 219, 0.7) 0%, rgba(41, 128, 185, 0.7) 100%)';
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(52, 152, 219, 0.6)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(52, 152, 219, 0.4) 0%, rgba(41, 128, 185, 0.4) 100%)';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(52, 152, 219, 0.3)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ←
              </button>
            )}
          </div>
          
          {/* BOUTONS VUE EN COLONNE VERTICALE À DROITE */}
          <div 
            style={{
            position: 'absolute',
            right: '15px',
            top: isMobile ? '70px' : '50%',
            transform: isMobile ? 'none' : 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? '8px' : '12px',
            zIndex: 100,
            alignItems: 'center'
          }}>
            {/* Bouton Trajectoire - horizontal (masqué en mode What-If) */}
            {!whatIfMode && (
            <button
              data-tooltip="trajectory"
              onClick={(e) => { 
                e.stopPropagation(); 
                // ✅ Bloquer pendant le guide
                if (showGuide || showContinueBar) return;
                const currentView = perspectiveView || 'day';
                // Utiliser la date selon la vue active
                let currentDateStr;
                if (currentView === 'year') {
                  const navYear = navigationYears[navYearIndex] || navigationYears[0];
                  currentDateStr = `${navYear.year}-01-01`;
                } else if (currentView === 'month') {
                  const navMonth = navigationMonths[navMonthIndex] || navigationMonths[0];
                  currentDateStr = `${navMonth.year}-${String(navMonth.month + 1).padStart(2, '0')}-01`;
                } else {
                  currentDateStr = currentDay?.dateStr || todayStr;
                }
                navigate(`/gps/itineraire?view=${currentView}&date=${currentDateStr}`);
              }}
              disabled={showGuide || showContinueBar}
              style={{ 
                cursor: (showGuide || showContinueBar) ? 'not-allowed' : 'pointer',
                opacity: (showGuide || showContinueBar) ? 0.5 : 1,
                padding: isMobile ? '8px' : '8px 12px',
                borderRadius: isMobile ? '50%' : '12px',
                width: isMobile ? '36px' : 'auto',
                height: isMobile ? '36px' : 'auto',
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)'
                  : 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
                border: isDark ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(102, 126, 234, 0.4)',
                boxShadow: isDark ? '0 0 15px rgba(102, 126, 234, 0.3)' : '0 4px 15px rgba(102, 126, 234, 0.2)',
                transition: 'all 0.3s',
                color: isDark ? 'white' : '#1e293b',
                fontSize: isMobile ? '1em' : '0.7em',
                fontWeight: 'bold',
                textShadow: isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
              onMouseEnter={(e) => {
                if (showGuide || showContinueBar) return;
                e.currentTarget.style.background = isDark 
                  ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.6) 0%, rgba(118, 75, 162, 0.6) 100%)'
                  : 'linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.25) 100%)';
                e.currentTarget.style.boxShadow = isDark 
                  ? '0 0 25px rgba(102, 126, 234, 0.5)'
                  : '0 6px 20px rgba(102, 126, 234, 0.3)';
              }}
              onMouseLeave={(e) => {
                if (showGuide || showContinueBar) return;
                e.currentTarget.style.background = isDark 
                  ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)'
                  : 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)';
                e.currentTarget.style.boxShadow = isDark 
                  ? '0 0 15px rgba(102, 126, 234, 0.3)'
                  : '0 4px 15px rgba(102, 126, 234, 0.2)';
              }}
            >
              🛣️{!isMobile && ` ${t('gps.navigation.trajectoryButton')}`}
            </button>
            )}
            
            {/* Conteneur des 3 boutons de vue */}
            <div data-tooltip="views" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            {/* Bouton Year - 🟣 */}
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                // ✅ Bloquer pendant le guide
                if (showGuide || showContinueBar) return;
                if (isViewTransitioning || isTeleporting) return;
                if (perspectiveView === 'year') {
                  // Déjà en vue Année - téléporter vers l'année actuelle
                  const currentYearIdx = navigationYears.findIndex(y => y.year === new Date().getFullYear());
                  if (currentYearIdx !== -1 && navYearIndex !== currentYearIdx) {
                    teleportToIndex(currentYearIdx, null, 'year');
                  }
                } else {
                  changeViewWithAnimation('year');
                }
              }}
              disabled={showGuide || showContinueBar}
              title={!canAccessGpsView('year') ? t('gps.navigation.premiumRequired', 'Plan Essentiel requis') : t('gps.navigation.yearButton')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: isMobile ? '36px' : '44px',
                height: isMobile ? '36px' : '44px',
                borderRadius: '12px',
                border: !canAccessGpsView('year') 
                  ? '2px solid rgba(255,255,255,0.1)'
                  : perspectiveView === 'year' ? '2px solid #00bcd4' : '2px solid rgba(255,255,255,0.2)',
                background: !canAccessGpsView('year')
                  ? 'rgba(100,100,100,0.2)'
                  : perspectiveView === 'year' ? 'rgba(0, 188, 212, 0.3)' : 'rgba(255,255,255,0.05)',
                cursor: (showGuide || showContinueBar) ? 'not-allowed' : 'pointer',
                opacity: !canAccessGpsView('year') ? 0.5 : (showGuide || showContinueBar) ? 0.5 : 1,
                transition: 'all 0.3s ease',
                fontSize: isMobile ? '16px' : '20px',
                position: 'relative'
              }}
            >
              {!canAccessGpsView('year') ? '🔒' : '🟣'}
            </button>
            
            {/* Bouton Month - 🟢 */}
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                // ✅ Bloquer pendant le guide
                if (showGuide || showContinueBar) return;
                if (isViewTransitioning || isTeleporting) return;
                if (perspectiveView === 'month') {
                  // Déjà en vue Mois - téléporter vers le mois actuel
                  const today = new Date();
                  const currentMonthIdx = navigationMonths.findIndex(m => 
                    m.month === today.getMonth() && m.year === today.getFullYear()
                  );
                  if (currentMonthIdx !== -1 && navMonthIndex !== currentMonthIdx) {
                    teleportToIndex(currentMonthIdx, null, 'month');
                  }
                } else {
                  changeViewWithAnimation('month');
                }
              }}
              disabled={showGuide || showContinueBar}
              title={!canAccessGpsView('month') ? t('gps.navigation.premiumRequired', 'Plan Essentiel requis') : t('gps.navigation.monthButton')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: isMobile ? '36px' : '44px',
                height: isMobile ? '36px' : '44px',
                borderRadius: '12px',
                border: !canAccessGpsView('month')
                  ? '2px solid rgba(255,255,255,0.1)'
                  : perspectiveView === 'month' ? '2px solid #5dade2' : '2px solid rgba(255,255,255,0.2)',
                background: !canAccessGpsView('month')
                  ? 'rgba(100,100,100,0.2)'
                  : perspectiveView === 'month' ? 'rgba(46, 204, 113, 0.3)' : 'rgba(255,255,255,0.05)',
                cursor: (showGuide || showContinueBar) ? 'not-allowed' : 'pointer',
                opacity: !canAccessGpsView('month') ? 0.5 : (showGuide || showContinueBar) ? 0.5 : 1,
                transition: 'all 0.3s ease',
                fontSize: isMobile ? '16px' : '20px',
                position: 'relative'
              }}
            >
              {!canAccessGpsView('month') ? '🔒' : '🟢'}
            </button>
            
            {/* Bouton Day - 🔵 */}
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                // ✅ Bloquer pendant le guide
                if (showGuide || showContinueBar) return;
                if (isViewTransitioning || isTeleporting) return;
                if (perspectiveView === 'day') {
                  // Déjà en vue Jour - téléporter vers aujourd'hui (index 0)
                  if (navIndex !== 0) {
                    teleportToIndex(0, null, 'day');
                  }
                } else {
                  changeViewWithAnimation('day');
                }
              }}
              disabled={showGuide || showContinueBar}
              title={t('gps.navigation.dayButton')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: isMobile ? '36px' : '44px',
                height: isMobile ? '36px' : '44px',
                borderRadius: '12px',
                border: perspectiveView === 'day' ? '2px solid #3498db' : '2px solid rgba(255,255,255,0.2)',
                background: perspectiveView === 'day' ? 'rgba(52, 152, 219, 0.3)' : 'rgba(255,255,255,0.05)',
                cursor: (showGuide || showContinueBar) ? 'not-allowed' : 'pointer',
                opacity: (showGuide || showContinueBar) ? 0.5 : 1,
                transition: 'all 0.3s ease',
                fontSize: isMobile ? '16px' : '20px'
              }}
            >
              🔵
            </button>
            </div>{/* Fin conteneur des 3 boutons de vue */}
          </div>

          
          {/* LIGNE DORÉE - Trajectoire vers l'horizon (jusqu'en bas) */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '25%',
            bottom: '0%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 5,
            pointerEvents: 'none'
          }}>
            {/* Ligne principale avec perspective via clip-path */}
            <div style={{
              width: '100%',
              height: '100%',
              position: 'relative'
            }}>
              {/* Ligne centrale - fine en haut, légèrement plus large en bas */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '0',
                bottom: '0',
                width: '6px',
                transform: 'translateX(-50%)',
                background: whatIfMode === 'foundations'
                  ? (routeGlowEffect 
                    ? 'linear-gradient(to bottom, rgba(46,204,113,0.5) 0%, rgba(39,174,96,0.8) 30%, rgba(32,178,90,0.9) 60%, #2ecc71 100%)'
                    : 'linear-gradient(to bottom, rgba(46,204,113,0.3) 0%, rgba(39,174,96,0.6) 30%, rgba(46,204,113,0.8) 60%, #2ecc71 100%)')
                  : whatIfMode === 'smartRoute'
                    ? (routeGlowEffect 
                      ? 'linear-gradient(to bottom, rgba(0,188,212,0.5) 0%, rgba(0,151,167,0.8) 30%, rgba(0,131,143,0.9) 60%, #00bcd4 100%)'
                      : 'linear-gradient(to bottom, rgba(0,188,212,0.3) 0%, rgba(0,151,167,0.6) 30%, rgba(0,188,212,0.8) 60%, #00bcd4 100%)')
                    : (routeGlowEffect 
                      ? 'linear-gradient(to bottom, rgba(255,215,0,0.5) 0%, rgba(255,200,0,0.8) 30%, rgba(255,140,0,0.9) 60%, #ffd700 100%)'
                      : 'linear-gradient(to bottom, rgba(255,150,0,0.3) 0%, rgba(255,180,0,0.6) 30%, rgba(255,200,0,0.8) 60%, #ffd700 100%)'),
                clipPath: 'polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)',
                borderRadius: '1px',
                transition: 'background 0.8s ease',
                animation: routeGlowEffect ? 'route-optimization-glow 2s ease-in-out' : 'none'
              }} />
              
              {/* Glow externe subtil */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '0',
                bottom: '0',
                width: '20px',
                transform: 'translateX(-50%)',
                background: whatIfMode === 'foundations'
                  ? (routeGlowEffect
                    ? 'linear-gradient(to bottom, rgba(243,156,18,0.1) 0%, rgba(230,126,34,0.2) 50%, rgba(211,84,0,0.3) 100%)'
                    : 'linear-gradient(to bottom, rgba(243,156,18,0.05) 0%, rgba(230,126,34,0.1) 50%, rgba(243,156,18,0.2) 100%)')
                  : whatIfMode === 'smartRoute'
                    ? (routeGlowEffect
                      ? 'linear-gradient(to bottom, rgba(155,89,182,0.1) 0%, rgba(142,68,173,0.2) 50%, rgba(125,60,152,0.3) 100%)'
                      : 'linear-gradient(to bottom, rgba(155,89,182,0.05) 0%, rgba(142,68,173,0.1) 50%, rgba(155,89,182,0.2) 100%)')
                    : (routeGlowEffect
                      ? 'linear-gradient(to bottom, rgba(255,215,0,0.1) 0%, rgba(255,200,0,0.2) 50%, rgba(255,140,0,0.3) 100%)'
                      : 'linear-gradient(to bottom, rgba(255,165,0,0.05) 0%, rgba(255,165,0,0.1) 50%, rgba(255,215,0,0.2) 100%)'),
                clipPath: 'polygon(45% 0%, 55% 0%, 100% 100%, 0% 100%)',
                filter: 'blur(4px)',
                transition: 'background 0.8s ease',
                animation: routeGlowEffect ? 'route-glow-pulse 1s ease-in-out infinite' : 'none'
              }} />
              
              {/* Particules sparkle - effet optimisation */}
              {routeGlowEffect && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: `${20 + i * 15}%`,
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, #fff 0%, rgba(255,215,0,0.8) 100%)',
                        transform: 'translateX(-50%)',
                        animation: `route-sparkle 1.5s ease-out ${i * 0.2}s infinite`,
                        boxShadow: '0 0 10px rgba(255,215,0,0.8)'
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
          
          {/* LIGNE D'HORIZON - subtile, sous le logo O */}
          <div style={{
            position: 'absolute',
            top: 'calc(15px + 260px)',
            left: '0',
            right: '0',
            height: '2px',
            background: whatIfMode === 'foundations'
              ? 'linear-gradient(90deg, transparent 0%, rgba(46,204,113,0.3) 30%, rgba(39,174,96,0.5) 50%, rgba(46,204,113,0.3) 70%, transparent 100%)'
              : whatIfMode === 'smartRoute'
                ? 'linear-gradient(90deg, transparent 0%, rgba(0,188,212,0.3) 30%, rgba(0,151,167,0.5) 50%, rgba(0,188,212,0.3) 70%, transparent 100%)'
                : (isDark 
                  ? 'linear-gradient(90deg, transparent 0%, rgba(255,200,100,0.3) 30%, rgba(255,180,80,0.5) 50%, rgba(255,200,100,0.3) 70%, transparent 100%)'
                  : 'linear-gradient(90deg, transparent 0%, rgba(255,180,80,0.5) 30%, rgba(255,160,60,0.7) 50%, rgba(255,180,80,0.5) 70%, transparent 100%)'),
            zIndex: 4
          }} />
          
          {/* LIGNES DE FUITE - perspective selon la vue (Année/Mois/Jour) */}
          <svg
            style={{
              position: 'absolute',
              left: '0',
              right: '0',
              top: '25%',
              bottom: '0',
              width: '100%',
              height: '75%',
              pointerEvents: 'none',
              zIndex: 3
            }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* ClipPath pour couper au niveau de la ligne horizontale */}
            <defs>
              <clipPath id="horizonClip">
                <rect x="0" y="10" width="100" height="90" />
              </clipPath>
            </defs>
            <g clipPath="url(#horizonClip)">
              {/* Ligne de fuite gauche */}
              <line
                x1={perspectiveView === 'year' ? "0" : "10"}
                y1="100"
                x2={perspectiveView === 'year' ? "38" : "43"}
                y2="0"
                stroke={whatIfMode === 'foundations' 
                  ? "rgba(46, 204, 113, 0.25)" 
                  : whatIfMode === 'smartRoute' 
                    ? "rgba(0, 188, 212, 0.25)" 
                    : (isDark ? "rgba(255, 200, 100, 0.15)" : "rgba(255, 180, 80, 0.35)")}
                strokeWidth={isDark ? "0.3" : "0.5"}
              />
              {/* Ligne de fuite droite */}
              <line
                x1={perspectiveView === 'year' ? "100" : "90"}
                y1="100"
                x2={perspectiveView === 'year' ? "62" : "57"}
                y2="0"
                stroke={whatIfMode === 'foundations' 
                  ? "rgba(46, 204, 113, 0.25)" 
                  : whatIfMode === 'smartRoute' 
                    ? "rgba(0, 188, 212, 0.25)" 
                    : (isDark ? "rgba(255, 200, 100, 0.15)" : "rgba(255, 180, 80, 0.35)")}
                strokeWidth={isDark ? "0.3" : "0.5"}
              />
            </g>
          </svg>
          
          {/* LOGO O - PORTAIL À L'HORIZON avec CALENDRIER DYNAMIQUE */}
          {/* Cercle externe avec pulse orange/doré - Style Budget */}
          <div style={{
            position: 'absolute',
            top: 'calc(15px + 130px)',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            border: '3px solid transparent',
            background: whatIfMode === 'foundations'
            ? 'linear-gradient(#0a1f0a, #0d2818) padding-box, linear-gradient(180deg, #2ecc7160, #27ae6040, #1e8e4e30, #2ecc7160) border-box'
            : whatIfMode === 'smartRoute'
              ? 'linear-gradient(#001a1f, #002830) padding-box, linear-gradient(180deg, #00bcd460, #0097a740, #00838f30, #00bcd460) border-box'
              : (isDark 
                  ? 'linear-gradient(#040449, #100261) padding-box, linear-gradient(180deg, #ffd70060, #ff8c0040, #ff450030, #ffd70060) border-box'
                  : 'linear-gradient(#ffffff, #f8fafc) padding-box, linear-gradient(180deg, #ffd700a0, #ff8c0080, #ff450070, #ffd700a0) border-box'),
            animation: 'pulse-glow-gps 3s ease-in-out infinite',
            pointerEvents: 'none',
            boxShadow: whatIfMode === 'foundations'
            ? '0 0 30px rgba(46, 204, 113, 0.15)'
            : whatIfMode === 'smartRoute'
              ? '0 0 30px rgba(0, 188, 212, 0.15)'
              : (isDark ? '0 0 30px rgba(255, 165, 0, 0.15)' : '0 0 30px rgba(255, 165, 0, 0.25)'),
            zIndex: 5
          }} />
          {/* Cercle interne avec pulse orange/doré - Style Budget */}
          <div style={{
            position: 'absolute',
            top: 'calc(15px + 130px)',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            border: '4px solid transparent',
            background: whatIfMode === 'foundations'
            ? 'linear-gradient(#0a1f0a, #0d2818) padding-box, linear-gradient(180deg, #2ecc7180, #27ae6060, #1e8e4e50, #2ecc7180) border-box'
            : whatIfMode === 'smartRoute'
              ? 'linear-gradient(#001a1f, #002830) padding-box, linear-gradient(180deg, #00bcd480, #0097a760, #00838f50, #00bcd480) border-box'
              : (isDark 
                  ? 'linear-gradient(#040449, #100261) padding-box, linear-gradient(180deg, #ffd70080, #ff8c0060, #ff450050, #ffd70080) border-box'
                  : 'linear-gradient(#ffffff, #f8fafc) padding-box, linear-gradient(180deg, #ffd700c0, #ff8c00a0, #ff450090, #ffd700c0) border-box'),
            animation: 'pulse-glow-gps 3s ease-in-out infinite 0.4s',
            pointerEvents: 'none',
            boxShadow: whatIfMode === 'foundations'
            ? '0 0 40px rgba(46, 204, 113, 0.2)'
            : whatIfMode === 'smartRoute'
              ? '0 0 40px rgba(0, 188, 212, 0.2)'
              : (isDark ? '0 0 40px rgba(255, 165, 0, 0.2)' : '0 0 40px rgba(255, 165, 0, 0.35)'),
            zIndex: 6
          }} />
          {/* Calendrier */}
          {(() => {
            const monthNames = t('gps.navigation.monthNamesShort', { returnObjects: true });
            const dayNames = t('gps.navigation.dayNamesShort', { returnObjects: true });
            const todayDate = new Date();
            
            // VUE ANNÉE - Affiche une grille d'années (4x3 = 12 années visibles)
            if (perspectiveView === 'year') {
              const navYear = navigationYears[navYearIndex] || navigationYears[0];
              const selectedYear = navYear?.year || todayDate.getFullYear();
              const currentYear = todayDate.getFullYear();
              
              // Calculer quel groupe de 12 années afficher (comme des pages)
              // Groupe 0: 2026-2037, Groupe 1: 2038-2049, etc.
              const yearOffset = selectedYear - currentYear;
              const groupIndex = Math.floor(yearOffset / 12);
              const startYear = currentYear + (groupIndex * 12);
              const visibleYears = Array.from({ length: 12 }, (_, i) => startYear + i);
              
              return (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    // Cliquer ramène à l'année actuelle
                    const currentYearIdx = navigationYears.findIndex(y => y.year === currentYear);
                    if (currentYearIdx !== -1) {
                      setNavYearIndex(currentYearIdx);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 'calc(15px + 130px)',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    background: whatIfMode === 'foundations'
                    ? 'linear-gradient(180deg, #0a1f0a 0%, #0d2818 100%)'
                    : whatIfMode === 'smartRoute'
                      ? 'linear-gradient(180deg, #001a1f 0%, #002830 100%)'
                      : (isDark 
                          ? 'linear-gradient(180deg, #040449 0%, #100261 100%)'
                          : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'),
                    border: 'none',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '15px',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  {/* Titre 2O */}
                  <div style={{
                    color: '#ffd700',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.5)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    2<span style={{ 
                      display: 'inline-block',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      border: '2px solid #ffd700',
                      background: 'transparent'
                    }}></span>
                  </div>
                  
                  {/* Grille des 12 années (4x3) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '4px',
                    width: '100%'
                  }}>
                    {visibleYears.map((year) => {
                      const isSelected = year === selectedYear;
                      const isCurrentYear = year === currentYear;
                      
                      return (
                        <div key={year} style={{
                          padding: '6px 2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: isSelected ? '#1a1a4e' : isCurrentYear ? '#ffd700' : (isDark ? 'rgba(255,255,255,0.8)' : '#1e293b'),
                          background: isSelected ? '#ffd700' : 'transparent',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          border: isCurrentYear && !isSelected ? '1px solid #ffd700' : 'none',
                          transition: 'all 0.2s ease'
                        }}>
                          {year}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            
            // VUE MOIS - Affiche les 12 mois de l'année
            if (perspectiveView === 'month') {
              const navMonth = navigationMonths[navMonthIndex] || navigationMonths[0];
              const selectedYear = navMonth?.year || todayDate.getFullYear();
              const selectedMonthNum = navMonth?.month ?? todayDate.getMonth();
              const currentMonthNum = todayDate.getMonth();
              const currentYear = todayDate.getFullYear();
              
              return (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    // Cliquer ramène au mois actuel
                    const currentMonthIdx = navigationMonths.findIndex(m => 
                      m.month === currentMonthNum && m.year === currentYear
                    );
                    if (currentMonthIdx !== -1) {
                      setNavMonthIndex(currentMonthIdx);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 'calc(15px + 130px)',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    background: whatIfMode === 'foundations'
                    ? 'linear-gradient(180deg, #0a1f0a 0%, #0d2818 100%)'
                    : whatIfMode === 'smartRoute'
                      ? 'linear-gradient(180deg, #001a1f 0%, #002830 100%)'
                      : (isDark 
                          ? 'linear-gradient(180deg, #040449 0%, #100261 100%)'
                          : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'),
                    border: 'none',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '15px',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  {/* Année */}
                  <div style={{
                    color: '#ffd700',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.5)' : 'none'
                  }}>
                    {selectedYear}
                  </div>
                  
                  {/* Grille des 12 mois (4x3) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '4px',
                    width: '100%'
                  }}>
                    {monthNames.map((monthName, monthIdx) => {
                      const isSelected = monthIdx === selectedMonthNum && selectedYear === (navMonth?.year || currentYear);
                      const isCurrentMonth = monthIdx === currentMonthNum && selectedYear === currentYear;
                      
                      return (
                        <div key={monthIdx} style={{
                          padding: '6px 2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: isSelected ? '#1a1a4e' : isCurrentMonth ? '#ffd700' : (isDark ? 'rgba(255,255,255,0.8)' : '#1e293b'),
                          background: isSelected ? '#ffd700' : 'transparent',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          border: isCurrentMonth && !isSelected ? '1px solid #ffd700' : 'none',
                          transition: 'all 0.2s ease'
                        }}>
                          {monthName}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            
            // VUE JOUR - Affiche le calendrier du mois avec jours
            const navDay = navigationDays[navIndex] || navigationDays[0];
            const selectedDate = navDay?.date || todayDate;
            const selectedDay = selectedDate.getDate();
            const selectedMonth = selectedDate.getMonth();
            const selectedYear = selectedDate.getFullYear();
            const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            const isCurrentMonth = todayDate.getMonth() === selectedMonth && todayDate.getFullYear() === selectedYear;
            const todayDay = isCurrentMonth ? todayDate.getDate() : null;
            
            const calendarDays = [];
            for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
            for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
            
            return (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  // Cliquer ramène à aujourd'hui
                  setNavIndex(0);
                }}
                style={{
                  position: 'absolute',
                  top: 'calc(15px + 130px)',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  background: whatIfMode === 'foundations'
                  ? 'linear-gradient(180deg, #0a1f0a 0%, #0d2818 100%)'
                  : whatIfMode === 'smartRoute'
                    ? 'linear-gradient(180deg, #001a1f 0%, #002830 100%)'
                    : (isDark 
                        ? 'linear-gradient(180deg, #040449 0%, #100261 100%)'
                        : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'),
                  border: 'none',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '15px',
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
              >
                {/* Mois et année */}
                <div style={{
                  color: '#ffd700',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '6px',
                  textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.5)' : 'none'
                }}>
                  {monthNames[selectedMonth]} {selectedYear}
                </div>
                
                {/* Jours de la semaine */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '2px',
                  width: '100%',
                  marginBottom: '4px'
                }}>
                  {dayNames.map((d, i) => (
                    <div key={i} style={{
                      color: whatIfMode ? 'rgba(255,255,255,0.6)' : (isDark ? 'rgba(255,255,255,0.6)' : '#64748b'),
                      fontSize: '10px',
                      textAlign: 'center',
                      fontWeight: 'bold'
                    }}>{d}</div>
                  ))}
                </div>
                
                {/* Grille des jours */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '1px',
                  width: '100%'
                }}>
                  {calendarDays.slice(0, 35).map((day, i) => {
                    const isSelected = day === selectedDay;
                    const isToday = day === todayDay;
                    
                    return (
                      <div key={i} style={{
                        width: '18px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        color: isSelected ? '#1a1a4e' : isToday ? '#ffd700' : (whatIfMode ? 'rgba(255,255,255,0.8)' : (isDark ? 'rgba(255,255,255,0.8)' : '#1e293b')),
                        background: isSelected ? '#ffd700' : 'transparent',
                        borderRadius: isSelected || isToday ? '50%' : '0',
                        fontWeight: 'bold',
                        border: isToday && !isSelected ? '1px solid #ffd700' : 'none'
                      }}>
                        {day || ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          
          {/* 🔒 v12: Grande bulle logo déplacée vers l'horizon - voir "Point de fuite" ci-dessus */}
          {/* La valeur nette sera affichée en bas avec les comptes */}
          
          {/* BULLES CONTENEURS - Entrées à gauche, Sorties à droite */}
          {(() => {
            // VUE ANNÉE - Grouper les transactions par année
            if (perspectiveView === 'year') {
              const yearsToShow = navigationYears.slice(navYearIndex, navYearIndex + 4);
              const allYearGroups = [];
              
              yearsToShow.forEach((year, yearIdx) => {
                const yearEntries = [];
                const yearSorties = [];
                
                accounts.forEach(acc => {
                  const accData = year.accounts?.[acc.nom];
                  if (accData) {
                    if (accData.entrees && accData.entrees.length > 0) {
                      accData.entrees.forEach((entree) => {
                        yearEntries.push({ ...entree, compte: acc.nom });
                      });
                    }
                    if (accData.sorties && accData.sorties.length > 0) {
                      accData.sorties.forEach((sortie) => {
                        yearSorties.push({ ...sortie, compte: acc.nom });
                      });
                    }
                  }
                });
                
                if (yearEntries.length > 0 || yearSorties.length > 0) {
                  allYearGroups.push({
                    yearIndex: yearIdx,
                    yearLabel: year.label,
                    yearKey: year.yearKey,
                    entries: yearEntries,
                    sorties: yearSorties,
                    // 🔗 Filtrer les entrées liées (transferts internes) pour le vrai total
                    totalEntrees: yearEntries.filter(e => !linkedEntreeDescriptions.has(e.description)).reduce((sum, e) => sum + e.montant, 0),
                    totalSorties: yearSorties.reduce((sum, s) => sum + s.montant, 0),
                    countEntrees: yearEntries.length,
                    countSorties: yearSorties.length
                  });
                }
              });
              
              const reversedGroups = [...allYearGroups].reverse();
              // Positions X ajustées pour la vue Année (plus proches du centre)
              const x1Left = isMobile ? 18 : 12;  // Position la plus éloignée gauche
              const x2Left = isMobile ? 42 : 40;  // Position la plus proche gauche (vers horizon)
              const x1Right = isMobile ? 82 : 88; // Position la plus éloignée droite
              const x2Right = isMobile ? 58 : 60; // Position la plus proche droite (vers horizon)
              
              const bubbles = [];
              
              reversedGroups.forEach((group, index) => {
                // Sur mobile, cacher la première bulle (celle sur le calendrier)
                if (isMobile && index === 0) return;
                
                const progressValues = [0.05, 0.27, 0.49, 0.85];
                const progress = progressValues[index] || (0.05 + (index * 0.22));
                const yPos = 25 + (62 * progress);
                const baseSize = isMobile ? (50 + (progress * 120)) : (70 + (progress * 190));
                
                // BULLE ENTRÉES (gauche)
                if (group.countEntrees > 0) {
                  const xPosLeft = x2Left + (x1Left - x2Left) * progress;
                  
                  bubbles.push(
                    <div
                      key={`container-entree-year-${group.yearKey}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBubble({
                          id: `year-entries-${group.yearKey}`,
                          type: 'entree',
                          dayLabel: group.yearLabel,
                          daysAway: group.yearIndex,
                          transactions: [...group.entries].sort((a, b) => a.description.localeCompare(b.description)).map(e => ({ description: e.description, montant: e.montant, compte: e.compte })),
                          total: group.totalEntrees,
                          count: group.countEntrees
                        });
                      }}
                      style={{
                        position: 'absolute',
                        left: `${xPosLeft}%`,
                        top: `${yPos}%`,
                        transform: 'translate(-50%, -50%)',
                        width: `${baseSize * 1.1}px`,
                        height: `${baseSize * 1.1}px`,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, rgba(52, 152, 219, 0.9), rgba(41, 128, 185, 0.85), rgba(30, 100, 160, 0.8))',
                        border: '3px solid rgba(255,255,255,0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 15 - index,
                        boxShadow: `0 0 ${20 + progress * 30}px rgba(52, 152, 219, 0.6), inset 0 0 ${10 + progress * 20}px rgba(255,255,255,0.2)`,
                        opacity: 0.75 + (progress * 0.25),
                        transition: 'all 0.3s ease',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          color: 'rgba(255,255,255,0.95)',
                          fontSize: `${Math.max(16, baseSize * 0.14)}px`,
                          fontWeight: 'bold',
                          textShadow: '0 2px 4px rgba(0,0,0,0.4)'
                        }}>{group.countEntrees}</span>
                        <div style={{
                          width: `${Math.max(12, baseSize * 0.1)}px`,
                          height: `${Math.max(12, baseSize * 0.1)}px`,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.4)',
                          border: '2px solid rgba(255,255,255,0.7)'
                        }} />
                      </div>
                      <div style={{ 
                        position: 'absolute',
                        bottom: '12%',
                        color: 'rgba(255,255,255,0.9)', 
                        fontSize: `${Math.max(10, baseSize * 0.09)}px`,
                        fontWeight: '600',
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                      }}>
                        {group.yearLabel}
                      </div>
                    </div>
                  );
                }
                
                // BULLE SORTIES (droite)
                if (group.countSorties > 0) {
                  const xPosRight = x2Right + (x1Right - x2Right) * progress;
                  
                  bubbles.push(
                    <div
                      key={`container-sortie-year-${group.yearKey}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBubble({
                          id: `year-sorties-${group.yearKey}`,
                          type: 'sortie',
                          dayLabel: group.yearLabel,
                          daysAway: group.yearIndex,
                          transactions: [...group.sorties].sort((a, b) => a.description.localeCompare(b.description)).map(s => ({ description: s.description, montant: s.montant, compte: s.compte })),
                          total: group.totalSorties,
                          count: group.countSorties
                        });
                      }}
                      style={{
                        position: 'absolute',
                        left: `${xPosRight}%`,
                        top: `${yPos}%`,
                        transform: 'translate(-50%, -50%)',
                        width: `${baseSize * 1.1}px`,
                        height: `${baseSize * 1.1}px`,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, rgba(255, 183, 77, 0.9), rgba(255, 152, 0, 0.85), rgba(230, 126, 0, 0.8))',
                        border: '3px solid rgba(255,255,255,0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 15 - index,
                        boxShadow: `0 0 ${20 + progress * 30}px rgba(255, 152, 0, 0.6), inset 0 0 ${10 + progress * 20}px rgba(255,255,255,0.2)`,
                        opacity: 0.75 + (progress * 0.25),
                        transition: 'all 0.3s ease',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          color: 'rgba(255,255,255,0.95)',
                          fontSize: `${Math.max(16, baseSize * 0.14)}px`,
                          fontWeight: 'bold',
                          textShadow: '0 2px 4px rgba(0,0,0,0.4)'
                        }}>{group.countSorties}</span>
                        <div style={{
                          width: `${Math.max(12, baseSize * 0.1)}px`,
                          height: `${Math.max(12, baseSize * 0.1)}px`,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.4)',
                          border: '2px solid rgba(255,255,255,0.7)'
                        }} />
                      </div>
                      <div style={{ 
                        position: 'absolute',
                        bottom: '12%',
                        color: 'rgba(255,255,255,0.9)', 
                        fontSize: `${Math.max(10, baseSize * 0.09)}px`,
                        fontWeight: '600',
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                      }}>
                        {group.yearLabel}
                      </div>
                    </div>
                  );
                }
              });
              
              // ⭐ BULLES D'OBJECTIFS ATTEINTS - VUE ANNÉE (TOUS les objectifs)
              allGoalsReached.forEach((goal, goalIdx) => {
                if (goal.viewType !== 'year') return;
                
                const relativeIndex = goal.globalIndex - navYearIndex;
                if (relativeIndex < 0 || relativeIndex >= 4) return; // Hors de la fenêtre visible
                
                const positionIndex = 3 - relativeIndex;
                const progressValues = [0.05, 0.27, 0.49, 0.85];
                const grProgress = progressValues[positionIndex] || (0.05 + (positionIndex * 0.22));
                const grYPos = 25 + (62 * grProgress);
                const grBaseSize = 70 + (grProgress * 190);
                const grBubbleSize = grBaseSize * 0.35;
                
                // Décalage horizontal pour éviter superposition si plusieurs objectifs sur même date
                const goalsAtSameIndex = allGoalsReached.filter(g => g.viewType === 'year' && g.globalIndex === goal.globalIndex);
                const indexInGroup = goalsAtSameIndex.findIndex(g => g.accountName === goal.accountName);
                const xOffset = 50 + (indexInGroup * 8) - ((goalsAtSameIndex.length - 1) * 4);
                
                bubbles.push(
                  <div
                    key={`goal-reached-year-${goal.dateStr}-${goal.accountName}`}
                    className="goal-reached-bubble"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isTeleporting) return; // Bloquer si déjà en cours
                      
                      // Téléportation vers l'index de l'objectif atteint (vue Année)
                      teleportToIndex(
                        goal.globalIndex,
                        () => {
                          setNavGoalReachedPopup({
                            dateStr: goal.dateStr,
                            label: goal.dayLabel,
                            accountName: goal.accountName,
                            goalName: goal.goalName,
                            montantCible: goal.montantCible,
                            soldeAtteint: goal.montantCible
                          });
                        },
                        'year'
                      );
                    }}
                    style={{
                      position: 'absolute',
                      left: `${xOffset}%`,
                      top: `${grYPos}%`,
                      transform: 'translate(-50%, -50%)',
                      width: `${grBubbleSize}px`,
                      height: `${grBubbleSize}px`,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 30% 30%, rgba(76, 175, 80, 0.95), rgba(56, 142, 60, 0.9), rgba(27, 94, 32, 0.85))',
                      border: '3px solid rgba(165, 214, 167, 0.8)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 52 + goalIdx,
                      boxShadow: '0 0 20px rgba(76, 175, 80, 0.7), 0 0 40px rgba(76, 175, 80, 0.4), inset 0 0 10px rgba(255,255,255,0.2)',
                      animation: 'goal-reached-pulse 1.5s ease-in-out infinite',
                      overflow: 'hidden'
                    }}
                  >
                    <span style={{
                      fontSize: `${Math.max(18, grBubbleSize * 0.45)}px`
                    }}>⭐</span>
                  </div>
                );
              });
              
              return bubbles;
            }
            
            // VUE MOIS - Grouper les transactions par mois
            if (perspectiveView === 'month') {
              const monthsToShow = navigationMonths.slice(navMonthIndex, navMonthIndex + 4);
              const allMonthGroups = [];
              
              monthsToShow.forEach((month, monthIdx) => {
                const monthEntries = [];
                const monthSorties = [];
                
                accounts.forEach(acc => {
                  const accData = month.accounts?.[acc.nom];
                  if (accData) {
                    if (accData.entrees && accData.entrees.length > 0) {
                      accData.entrees.forEach((entree) => {
                        monthEntries.push({ ...entree, compte: acc.nom });
                      });
                    }
                    if (accData.sorties && accData.sorties.length > 0) {
                      accData.sorties.forEach((sortie) => {
                        monthSorties.push({ ...sortie, compte: acc.nom });
                      });
                    }
                  }
                });
                
                if (monthEntries.length > 0 || monthSorties.length > 0) {
                  allMonthGroups.push({
                    monthIndex: monthIdx,
                    monthLabel: month.label,
                    monthKey: month.monthKey,
                    entries: monthEntries,
                    sorties: monthSorties,
                    // 🔗 Filtrer les entrées liées (transferts internes) pour le vrai total
                    totalEntrees: monthEntries.filter(e => !linkedEntreeDescriptions.has(e.description)).reduce((sum, e) => sum + e.montant, 0),
                    totalSorties: monthSorties.reduce((sum, s) => sum + s.montant, 0),
                    countEntrees: monthEntries.length,
                    countSorties: monthSorties.length
                  });
                }
              });
              
              const reversedGroups = [...allMonthGroups].reverse();
              const x1Left = isMobile ? 16 : 10;
              const x2Left = isMobile ? 44 : 43;
              const x1Right = isMobile ? 84 : 90;
              const x2Right = isMobile ? 56 : 57;
              
              const bubbles = [];
              
              reversedGroups.forEach((group, index) => {
                // Sur mobile, cacher la première bulle (celle sur le calendrier)
                if (isMobile && index === 0) return;
                
                // Espacement amélioré: plus d'espace entre les premières bulles
                const progressValues = [0.05, 0.27, 0.49, 0.85];
                const progress = progressValues[index] || (0.05 + (index * 0.22));
                const yPos = 25 + (62 * progress);
                const baseSize = isMobile ? (50 + (progress * 120)) : (70 + (progress * 190));
                
                // BULLE ENTRÉES (gauche)
                if (group.countEntrees > 0) {
                  const xPosLeft = x2Left + (x1Left - x2Left) * progress;
                  
                  bubbles.push(
                    <div
                      key={`container-entree-month-${group.monthKey}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBubble({
                          id: `month-entries-${group.monthKey}`,
                          type: 'entree',
                          dayLabel: group.monthLabel,
                          daysAway: group.monthIndex,
                          transactions: [...group.entries].sort((a, b) => a.description.localeCompare(b.description)).map(e => ({ description: e.description, montant: e.montant, compte: e.compte })),
                          total: group.totalEntrees,
                          count: group.countEntrees
                        });
                      }}
                      style={{
                        position: 'absolute',
                        left: `${xPosLeft}%`,
                        top: `${yPos}%`,
                        transform: 'translate(-50%, -50%)',
                        width: `${baseSize * 1.1}px`,
                        height: `${baseSize * 1.1}px`,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, rgba(52, 152, 219, 0.9), rgba(41, 128, 185, 0.85), rgba(30, 100, 160, 0.8))',
                        border: '3px solid rgba(255,255,255,0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 15 - index,
                        boxShadow: `0 0 ${20 + progress * 30}px rgba(52, 152, 219, 0.6), inset 0 0 ${10 + progress * 20}px rgba(255,255,255,0.2)`,
                        opacity: 0.75 + (progress * 0.25),
                        transition: 'all 0.3s ease',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          color: 'rgba(255,255,255,0.95)',
                          fontSize: `${Math.max(16, baseSize * 0.14)}px`,
                          fontWeight: 'bold',
                          textShadow: '0 2px 4px rgba(0,0,0,0.4)'
                        }}>{group.countEntrees}</span>
                        <div style={{
                          width: `${Math.max(12, baseSize * 0.1)}px`,
                          height: `${Math.max(12, baseSize * 0.1)}px`,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.4)',
                          border: '2px solid rgba(255,255,255,0.7)'
                        }} />
                      </div>
                      <div style={{ 
                        position: 'absolute',
                        bottom: '12%',
                        color: 'rgba(255,255,255,0.9)', 
                        fontSize: `${Math.max(10, baseSize * 0.09)}px`,
                        fontWeight: '600',
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                      }}>
                        {group.monthLabel}
                      </div>
                    </div>
                  );
                }
                
                // BULLE SORTIES (droite)
                if (group.countSorties > 0) {
                  const xPosRight = x2Right + (x1Right - x2Right) * progress;
                  
                  bubbles.push(
                    <div
                      key={`container-sortie-month-${group.monthKey}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBubble({
                          id: `month-sorties-${group.monthKey}`,
                          type: 'sortie',
                          dayLabel: group.monthLabel,
                          daysAway: group.monthIndex,
                          transactions: [...group.sorties].sort((a, b) => a.description.localeCompare(b.description)).map(s => ({ description: s.description, montant: s.montant, compte: s.compte })),
                          total: group.totalSorties,
                          count: group.countSorties
                        });
                      }}
                      style={{
                        position: 'absolute',
                        left: `${xPosRight}%`,
                        top: `${yPos}%`,
                        transform: 'translate(-50%, -50%)',
                        width: `${baseSize * 1.1}px`,
                        height: `${baseSize * 1.1}px`,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, rgba(255, 183, 77, 0.9), rgba(255, 152, 0, 0.85), rgba(230, 126, 0, 0.8))',
                        border: '3px solid rgba(255,255,255,0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 15 - index,
                        boxShadow: `0 0 ${20 + progress * 30}px rgba(255, 152, 0, 0.6), inset 0 0 ${10 + progress * 20}px rgba(255,255,255,0.2)`,
                        opacity: 0.75 + (progress * 0.25),
                        transition: 'all 0.3s ease',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          color: 'rgba(255,255,255,0.95)',
                          fontSize: `${Math.max(16, baseSize * 0.14)}px`,
                          fontWeight: 'bold',
                          textShadow: '0 2px 4px rgba(0,0,0,0.4)'
                        }}>{group.countSorties}</span>
                        <div style={{
                          width: `${Math.max(12, baseSize * 0.1)}px`,
                          height: `${Math.max(12, baseSize * 0.1)}px`,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.4)',
                          border: '2px solid rgba(255,255,255,0.7)'
                        }} />
                      </div>
                      <div style={{ 
                        position: 'absolute',
                        bottom: '12%',
                        color: 'rgba(255,255,255,0.9)', 
                        fontSize: `${Math.max(10, baseSize * 0.09)}px`,
                        fontWeight: '600',
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                      }}>
                        {group.monthLabel}
                      </div>
                    </div>
                  );
                }
              });
              
              // ⭐ BULLES D'OBJECTIFS ATTEINTS - VUE MOIS (TOUS les objectifs)
              allGoalsReached.forEach((goal, goalIdx) => {
                if (goal.viewType !== 'month') return;
                
                const relativeIndex = goal.globalIndex - navMonthIndex;
                if (relativeIndex < 0 || relativeIndex >= 4) return; // Hors de la fenêtre visible
                
                const positionIndex = 3 - relativeIndex;
                const progressValues = [0.05, 0.27, 0.49, 0.85];
                const grProgress = progressValues[positionIndex] || (0.05 + (positionIndex * 0.22));
                const grYPos = 25 + (62 * grProgress);
                const grBaseSize = 70 + (grProgress * 190);
                const grBubbleSize = grBaseSize * 0.35;
                
                // Décalage horizontal pour éviter superposition si plusieurs objectifs sur même mois
                const goalsAtSameIndex = allGoalsReached.filter(g => g.viewType === 'month' && g.globalIndex === goal.globalIndex);
                const indexInGroup = goalsAtSameIndex.findIndex(g => g.accountName === goal.accountName);
                const xOffset = 50 + (indexInGroup * 8) - ((goalsAtSameIndex.length - 1) * 4);
                
                bubbles.push(
                  <div
                    key={`goal-reached-month-${goal.dateStr}-${goal.accountName}`}
                    className="goal-reached-bubble"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isTeleporting) return; // Bloquer si déjà en cours
                      
                      // Téléportation vers l'index de l'objectif atteint (vue Mois)
                      teleportToIndex(
                        goal.globalIndex,
                        () => {
                          setNavGoalReachedPopup({
                            dateStr: goal.dateStr,
                            label: goal.dayLabel,
                            accountName: goal.accountName,
                            goalName: goal.goalName,
                            montantCible: goal.montantCible,
                            soldeAtteint: goal.montantCible
                          });
                        },
                        'month'
                      );
                    }}
                    style={{
                      position: 'absolute',
                      left: `${xOffset}%`,
                      top: `${grYPos}%`,
                      transform: 'translate(-50%, -50%)',
                      width: `${grBubbleSize}px`,
                      height: `${grBubbleSize}px`,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 30% 30%, rgba(76, 175, 80, 0.95), rgba(56, 142, 60, 0.9), rgba(27, 94, 32, 0.85))',
                      border: '3px solid rgba(165, 214, 167, 0.8)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 52 + goalIdx,
                      boxShadow: '0 0 20px rgba(76, 175, 80, 0.7), 0 0 40px rgba(76, 175, 80, 0.4), inset 0 0 10px rgba(255,255,255,0.2)',
                      animation: 'goal-reached-pulse 1.5s ease-in-out infinite',
                      overflow: 'hidden'
                    }}
                  >
                    <span style={{
                      fontSize: `${Math.max(18, grBubbleSize * 0.45)}px`
                    }}>⭐</span>
                  </div>
                );
              });
              
              return bubbles;
            }
            
            // VUE JOUR - Grouper les transactions par jour
            const daysToShow = navigationDays.slice(navIndex, navIndex + 4);
            const allDayGroups = [];
            
            daysToShow.forEach((day, dayIdx) => {
              const dayEntries = [];
              const daySorties = [];
              
              accounts.forEach(acc => {
                const accData = day.accounts?.[acc.nom];
                if (accData) {
                  if (accData.entrees && accData.entrees.length > 0) {
                    accData.entrees.forEach((entree) => {
                      dayEntries.push({ ...entree, compte: acc.nom });
                    });
                  }
                  if (accData.sorties && accData.sorties.length > 0) {
                    accData.sorties.forEach((sortie) => {
                      daySorties.push({ ...sortie, compte: acc.nom });
                    });
                  }
                }
              });
              
              if (dayEntries.length > 0 || daySorties.length > 0) {
                allDayGroups.push({
                  dayIndex: dayIdx,
                  dayLabel: day.label,
                  dateStr: day.dateStr,
                  entries: dayEntries,
                  sorties: daySorties,
                  // 🔗 Filtrer les entrées liées (transferts internes) pour le vrai total
                  totalEntrees: dayEntries.filter(e => !linkedEntreeDescriptions.has(e.description)).reduce((sum, e) => sum + e.montant, 0),
                  totalSorties: daySorties.reduce((sum, s) => sum + s.montant, 0),
                  countEntrees: dayEntries.length,
                  countSorties: daySorties.length
                });
              }
            });
            
            const reversedGroups = [...allDayGroups].reverse();
            
            // 🆕 BULLES FANTÔMES - Budgets exclus du mode What-If (affichés une seule fois)
            const excludedBudgetsData = (whatIfMode === 'foundations' || whatIfMode === 'smartRoute') 
              ? getExcludedBudgets(daysToShow[0]?.dateStr || '')
              : { entrees: [], sorties: [] };
            
            const x1Left = isMobile ? 16 : (perspectiveView === 'year' ? 0 : 10);
            const x2Left = isMobile ? 44 : (perspectiveView === 'year' ? 38 : 43);
            const x1Right = isMobile ? 84 : (perspectiveView === 'year' ? 100 : 90);
            const x2Right = isMobile ? 56 : (perspectiveView === 'year' ? 62 : 57);
            
            const bubbles = [];
            
            reversedGroups.forEach((group, index) => {
              // Sur mobile, cacher la première bulle (celle sur le calendrier)
              if (isMobile && index === 0) return;
              
              // Espacement amélioré: valeurs prédéfinies pour éviter le chevauchement
              const progressValues = [0.05, 0.27, 0.49, 0.85];
              const progress = progressValues[index] || (0.05 + (index * 0.22));
              const yPos = 25 + (62 * progress);
              // Taille réduite pour les bulles proches (max ~175px au lieu de 231px)
              const baseSize = isMobile ? (45 + (progress * 90)) : (60 + (progress * 135));
              
              // BULLE ENTRÉES (gauche) - avec éclatement radial au hover
              if (group.countEntrees > 0) {
                const xPosLeft = x2Left + (x1Left - x2Left) * progress;
                const entryBubbleId = `nav-entry-${group.dateStr}`;
                // Sur mobile, auto-éclater si c'est la date courante
                const isEntryHovered = hoveredRouteBubble === entryBubbleId || 
                  (isMobile && currentDay?.dateStr === group.dateStr);
                
                bubbles.push(
                  <div
                    key={`container-entree-${group.dateStr}`}
                    onMouseEnter={() => setHoveredRouteBubble(entryBubbleId)}
                    onMouseLeave={() => setHoveredRouteBubble(null)}
                    onClick={(e) => {
                      // Sur mobile, clic direct ouvre le modal
                      if (isMobile) {
                        e.stopPropagation();
                        setSelectedBubble({
                          id: `day-entries-${group.dateStr}`,
                          type: 'entree',
                          dayLabel: group.dayLabel,
                          daysAway: group.dayIndex,
                          transactions: group.entries.map(entry => ({ description: entry.description, montant: entry.montant, compte: entry.compte })),
                          total: group.totalEntrees,
                          count: group.countEntrees
                        });
                      }
                    }}
                    style={{
                      position: 'absolute',
                      left: `${xPosLeft}%`,
                      top: `${yPos}%`,
                      transform: 'translate(-50%, -50%)',
                      width: isEntryHovered ? `${Math.min(baseSize * 2, 280)}px` : `${baseSize * 1.1}px`,
                      height: isEntryHovered ? `${Math.min(baseSize * 2, 280)}px` : `${baseSize * 1.1}px`,
                      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      zIndex: isEntryHovered ? 100 : (15 - index),
                      pointerEvents: 'auto'
                    }}
                  >
                    {/* Bulle principale - se réduit au hover */}
                    <div
                      className={dropAnimationActive ? 'bubble-drop' : ''}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBubble({
                          id: `day-entries-${group.dateStr}`,
                          type: 'entree',
                          dayLabel: group.dayLabel,
                          daysAway: group.dayIndex,
                          transactions: group.entries.map(e => ({ description: e.description, montant: e.montant, compte: e.compte })),
                          total: group.totalEntrees,
                          count: group.countEntrees
                        });
                      }}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: isEntryHovered ? `${baseSize * 0.5}px` : `${baseSize * 1.1}px`,
                        height: isEntryHovered ? `${baseSize * 0.5}px` : `${baseSize * 1.1}px`,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, rgba(52, 152, 219, 0.9), rgba(41, 128, 185, 0.85), rgba(30, 100, 160, 0.8))',
                        border: '3px solid rgba(255,255,255,0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: `0 0 ${20 + progress * 30}px rgba(52, 152, 219, 0.6), inset 0 0 ${10 + progress * 20}px rgba(255,255,255,0.2)`,
                        opacity: dropAnimationActive ? 0 : (isEntryHovered ? 0.6 : (0.75 + (progress * 0.25))),
                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        overflow: 'hidden',
                        animationDelay: dropAnimationActive ? `${index * 0.12}s` : undefined
                      }}
                    >
                      {!isEntryHovered && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              color: 'rgba(255,255,255,0.95)',
                              fontSize: `${Math.max(16, baseSize * 0.14)}px`,
                              fontWeight: 'bold',
                              textShadow: '0 2px 4px rgba(0,0,0,0.4)'
                            }}>{group.countEntrees}</span>
                            <div style={{
                              width: `${Math.max(12, baseSize * 0.1)}px`,
                              height: `${Math.max(12, baseSize * 0.1)}px`,
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.4)',
                              border: '2px solid rgba(255,255,255,0.7)'
                            }} />
                          </div>
                          <div style={{ 
                            position: 'absolute',
                            bottom: '12%',
                            color: 'rgba(255,255,255,0.9)', 
                            fontSize: `${Math.max(10, baseSize * 0.09)}px`,
                            fontWeight: '600',
                            textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                          }}>
                            {group.dayLabel}
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Bulles individuelles en éclatement radial */}
                    {isEntryHovered && group.entries.map((entry, entryIdx) => {
                      const totalItems = group.entries.length;
                      const angle = (entryIdx / totalItems) * 2 * Math.PI - Math.PI / 2;
                      const expandedSize = Math.min(baseSize * 2, isMobile ? 200 : 280);
                      const radius = expandedSize * (isMobile ? 0.28 : 0.35);
                      const offsetX = Math.cos(angle) * radius;
                      const offsetY = Math.sin(angle) * radius;
                      const itemSize = Math.min(expandedSize * (isMobile ? 0.25 : 0.28), isMobile ? 55 : 65);
                      
                      return (
                        <div
                          key={`entry-item-${entryIdx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBubble({
                              id: `single-entry-${group.dateStr}-${entryIdx}`,
                              type: 'entree',
                              dayLabel: group.dayLabel,
                              daysAway: group.dayIndex,
                              transactions: [{ description: entry.description, montant: entry.montant, compte: entry.compte }],
                              total: entry.montant,
                              count: 1
                            });
                          }}
                          style={{
                            position: 'absolute',
                            left: `calc(50% + ${offsetX}px)`,
                            top: `calc(50% + ${offsetY}px)`,
                            transform: 'translate(-50%, -50%) scale(1)',
                            width: `${itemSize}px`,
                            height: `${itemSize}px`,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle at 30% 30%, rgba(52, 152, 219, 1), rgba(41, 128, 185, 0.95))',
                            border: '2px solid rgba(255,255,255,0.6)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(52, 152, 219, 0.5)',
                            opacity: 1,
                            animation: `radialExpand 0.3s ease-out ${entryIdx * 0.05}s both`,
                            padding: '4px',
                            overflow: 'hidden'
                          }}
                        >
                          <span style={{
                            color: 'white',
                            fontSize: `${Math.max(9, itemSize * 0.16)}px`,
                            fontWeight: '600',
                            textAlign: 'center',
                            lineHeight: '1.1',
                            maxWidth: '90%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                          }}>
                            {entry.description.length > 12 ? entry.description.substring(0, 10) + '...' : entry.description}
                          </span>
                          <span style={{
                            color: 'rgba(255,255,255,0.95)',
                            fontSize: `${Math.max(10, itemSize * 0.18)}px`,
                            fontWeight: 'bold',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                          }}>
                            {getTransactionSign('entree', entry.compte)}{Math.round(entry.montant)}$
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              
              // BULLE SORTIES (droite) - avec éclatement radial au hover
              if (group.countSorties > 0) {
                const xPosRight = x2Right + (x1Right - x2Right) * progress;
                const sortieBubbleId = `nav-sortie-${group.dateStr}`;
                // Sur mobile, auto-éclater si c'est la date courante
                const isSortieHovered = hoveredRouteBubble === sortieBubbleId ||
                  (isMobile && currentDay?.dateStr === group.dateStr);
                
                bubbles.push(
                  <div
                    key={`container-sortie-${group.dateStr}`}
                    onMouseEnter={() => setHoveredRouteBubble(sortieBubbleId)}
                    onMouseLeave={() => setHoveredRouteBubble(null)}
                    onClick={(e) => {
                      // Sur mobile, clic direct ouvre le modal
                      if (isMobile) {
                        e.stopPropagation();
                        setSelectedBubble({
                          id: `day-sorties-${group.dateStr}`,
                          type: 'sortie',
                          dayLabel: group.dayLabel,
                          daysAway: group.dayIndex,
                          transactions: group.sorties.map(s => ({ description: s.description, montant: s.montant, compte: s.compte })),
                          total: group.totalSorties,
                          count: group.countSorties
                        });
                      }
                    }}
                    style={{
                      position: 'absolute',
                      left: `${xPosRight}%`,
                      top: `${yPos}%`,
                      transform: 'translate(-50%, -50%)',
                      width: isSortieHovered ? `${Math.min(baseSize * 2, 280)}px` : `${baseSize * 1.1}px`,
                      height: isSortieHovered ? `${Math.min(baseSize * 2, 280)}px` : `${baseSize * 1.1}px`,
                      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      zIndex: isSortieHovered ? 100 : (15 - index),
                      pointerEvents: 'auto'
                    }}
                  >
                    {/* Bulle principale - se réduit au hover */}
                    <div
                      className={dropAnimationActive ? 'bubble-drop' : ''}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBubble({
                          id: `day-sorties-${group.dateStr}`,
                          type: 'sortie',
                          dayLabel: group.dayLabel,
                          daysAway: group.dayIndex,
                          transactions: group.sorties.map(s => ({ description: s.description, montant: s.montant, compte: s.compte })),
                          total: group.totalSorties,
                          count: group.countSorties
                        });
                      }}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: isSortieHovered ? `${baseSize * 0.5}px` : `${baseSize * 1.1}px`,
                        height: isSortieHovered ? `${baseSize * 0.5}px` : `${baseSize * 1.1}px`,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, rgba(255, 183, 77, 0.9), rgba(255, 152, 0, 0.85), rgba(230, 126, 0, 0.8))',
                        border: '3px solid rgba(255,255,255,0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: `0 0 ${20 + progress * 30}px rgba(255, 152, 0, 0.6), inset 0 0 ${10 + progress * 20}px rgba(255,255,255,0.2)`,
                        opacity: dropAnimationActive ? 0 : (isSortieHovered ? 0.6 : (0.75 + (progress * 0.25))),
                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        overflow: 'hidden',
                        animationDelay: dropAnimationActive ? `${index * 0.12 + 0.06}s` : undefined
                      }}
                    >
                      {!isSortieHovered && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              color: 'rgba(255,255,255,0.95)',
                              fontSize: `${Math.max(16, baseSize * 0.14)}px`,
                              fontWeight: 'bold',
                              textShadow: '0 2px 4px rgba(0,0,0,0.4)'
                            }}>{group.countSorties}</span>
                            <div style={{
                              width: `${Math.max(12, baseSize * 0.1)}px`,
                              height: `${Math.max(12, baseSize * 0.1)}px`,
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.4)',
                              border: '2px solid rgba(255,255,255,0.7)'
                            }} />
                          </div>
                          <div style={{ 
                            position: 'absolute',
                            bottom: '12%',
                            color: 'rgba(255,255,255,0.9)', 
                            fontSize: `${Math.max(10, baseSize * 0.09)}px`,
                            fontWeight: '600',
                            textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                          }}>
                            {group.dayLabel}
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Bulles individuelles en éclatement radial */}
                    {isSortieHovered && group.sorties.map((sortie, sortieIdx) => {
                      const totalItems = group.sorties.length;
                      const angle = (sortieIdx / totalItems) * 2 * Math.PI - Math.PI / 2;
                      const expandedSize = Math.min(baseSize * 2, isMobile ? 200 : 280);
                      const radius = expandedSize * (isMobile ? 0.28 : 0.35);
                      const offsetX = Math.cos(angle) * radius;
                      const offsetY = Math.sin(angle) * radius;
                      const itemSize = Math.min(expandedSize * (isMobile ? 0.25 : 0.28), isMobile ? 55 : 65);
                      
                      return (
                        <div
                          key={`sortie-item-${sortieIdx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBubble({
                              id: `single-sortie-${group.dateStr}-${sortieIdx}`,
                              type: 'sortie',
                              dayLabel: group.dayLabel,
                              daysAway: group.dayIndex,
                              transactions: [{ description: sortie.description, montant: sortie.montant, compte: sortie.compte }],
                              total: sortie.montant,
                              count: 1
                            });
                          }}
                          style={{
                            position: 'absolute',
                            left: `calc(50% + ${offsetX}px)`,
                            top: `calc(50% + ${offsetY}px)`,
                            transform: 'translate(-50%, -50%) scale(1)',
                            width: `${itemSize}px`,
                            height: `${itemSize}px`,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle at 30% 30%, rgba(255, 183, 77, 1), rgba(255, 152, 0, 0.95))',
                            border: '2px solid rgba(255,255,255,0.6)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(255, 152, 0, 0.5)',
                            opacity: 1,
                            animation: `radialExpand 0.3s ease-out ${sortieIdx * 0.05}s both`,
                            padding: '4px',
                            overflow: 'hidden'
                          }}
                        >
                          <span style={{
                            color: 'white',
                            fontSize: `${Math.max(9, itemSize * 0.16)}px`,
                            fontWeight: '600',
                            textAlign: 'center',
                            lineHeight: '1.1',
                            maxWidth: '90%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                          }}>
                            {sortie.description.length > 12 ? sortie.description.substring(0, 10) + '...' : sortie.description}
                          </span>
                          <span style={{
                            color: 'rgba(255,255,255,0.95)',
                            fontSize: `${Math.max(10, itemSize * 0.18)}px`,
                            fontWeight: 'bold',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                          }}>
                            {getTransactionSign('sortie', sortie.compte)}{Math.round(sortie.montant)}$
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }
            });
            
            
            // 🚨 BULLE DE DÉCOUVERT - Alignée dynamiquement avec la date du découvert
            if (firstOverdraft && overdraftVisibility.isVisible) {
              const overdraftGroupIndex = reversedGroups.findIndex(g => g.dateStr === firstOverdraft.dateStr);
              
              if (overdraftGroupIndex !== -1) {
                const odProgress = 0.1 + (overdraftGroupIndex * 0.25);
                const odYPos = 25 + (62 * odProgress);
                const odBaseSize = 80 + (odProgress * 180);
                const bubbleSize = odBaseSize * 0.35;
                
                bubbles.push(
                  <div
                    key={`overdraft-${firstOverdraft.dateStr}`}
                    className="overdraft-alert-bubble"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isTeleporting) return; // Bloquer si déjà en cours
                      
                      // Téléportation vers l'index du découvert
                      teleportToIndex(
                        firstOverdraft.globalIndex,
                        () => {
                          setNavOverdraftPopup({
                            dateStr: firstOverdraft.dateStr,
                            label: firstOverdraft.dayLabel,
                            accountName: firstOverdraft.accountName,
                            amount: firstOverdraft.amount
                          });
                        },
                        firstOverdraft.viewType || 'day'
                      );
                    }}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: `${odYPos}%`,
                      transform: 'translate(-50%, -50%)',
                      width: `${bubbleSize}px`,
                      height: `${bubbleSize}px`,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 30% 30%, rgba(156, 39, 176, 0.95), rgba(123, 31, 162, 0.9), rgba(74, 20, 140, 0.85))',
                      border: '3px solid rgba(206, 147, 216, 0.8)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 50,
                      boxShadow: '0 0 20px rgba(156, 39, 176, 0.7), 0 0 40px rgba(156, 39, 176, 0.4), inset 0 0 10px rgba(255,255,255,0.2)',
                      animation: 'overdraft-pulse 1.5s ease-in-out infinite',
                      overflow: 'hidden'
                    }}
                  >
                    <span style={{
                      fontSize: `${Math.max(18, bubbleSize * 0.45)}px`
                    }}>⚠️</span>
                  </div>
                );
              }
            }
            
            // 🏦 BULLE DE LIMITE DE CRÉDIT - Alignée dynamiquement avec la date (VIOLET)
            if (firstCreditLimit && creditLimitVisibility.isVisible) {
              const creditLimitGroupIndex = reversedGroups.findIndex(g => g.dateStr === firstCreditLimit.dateStr);
              
              if (creditLimitGroupIndex !== -1) {
                const clProgress = 0.1 + (creditLimitGroupIndex * 0.25);
                const clYPos = 25 + (62 * clProgress);
                const clBaseSize = 80 + (clProgress * 180);
                const clBubbleSize = clBaseSize * 0.35;
                
                // Décalage horizontal si même date que découvert
                const hasOverdraftAtSameDate = firstOverdraft && overdraftVisibility.isVisible && firstOverdraft.dateStr === firstCreditLimit.dateStr;
                const xOffset = hasOverdraftAtSameDate ? 58 : 50;
                
                bubbles.push(
                  <div
                    key={`credit-limit-${firstCreditLimit.dateStr}`}
                    className="credit-limit-bubble"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isTeleporting) return; // Bloquer si déjà en cours
                      
                      // Téléportation vers l'index de la limite de crédit
                      teleportToIndex(
                        firstCreditLimit.globalIndex,
                        () => {
                          setNavCreditLimitPopup({
                            dateStr: firstCreditLimit.dateStr,
                            label: firstCreditLimit.dayLabel,
                            accountName: firstCreditLimit.accountName,
                            solde: firstCreditLimit.solde,
                            limite: firstCreditLimit.limite
                          });
                        },
                        firstCreditLimit.viewType || 'day'
                      );
                    }}
                    style={{
                      position: 'absolute',
                      left: `${xOffset}%`,
                      top: `${clYPos}%`,
                      transform: 'translate(-50%, -50%)',
                      width: `${clBubbleSize}px`,
                      height: `${clBubbleSize}px`,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 30% 30%, rgba(156, 39, 176, 0.95), rgba(123, 31, 162, 0.9), rgba(74, 20, 140, 0.85))',
                      border: '3px solid rgba(206, 147, 216, 0.8)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 51,
                      boxShadow: '0 0 20px rgba(156, 39, 176, 0.7), 0 0 40px rgba(156, 39, 176, 0.4), inset 0 0 10px rgba(255,255,255,0.2)',
                      animation: 'credit-limit-pulse 1.5s ease-in-out infinite',
                      overflow: 'hidden'
                    }}
                  >
                    <span style={{
                      fontSize: `${Math.max(18, clBubbleSize * 0.45)}px`
                    }}>⚠️</span>
                  </div>
                );
              }
            }

            // ⭐ BULLES D'OBJECTIFS ATTEINTS - VUE JOUR (TOUS les objectifs)
            allGoalsReached.forEach((goal, goalIdx) => {
              if (goal.viewType !== 'day') return;
              
              const relativeIndex = goal.globalIndex - navIndex;
              if (relativeIndex < 0 || relativeIndex >= 4) return; // Hors de la fenêtre visible
              
              // Position basée sur l'index relatif (inversé car la route va du bas vers le haut)
              const positionIndex = 3 - relativeIndex; // 0 en haut, 3 en bas
              const progressValues = [0.05, 0.27, 0.49, 0.85];
              const grProgress = progressValues[positionIndex] || (0.05 + (positionIndex * 0.22));
              const grYPos = 25 + (62 * grProgress);
              const grBaseSize = 70 + (grProgress * 190);
              const grBubbleSize = grBaseSize * 0.35;
              
              // Décalage horizontal pour éviter superposition
              // Vérifier découvert et limite crédit au même index
              const hasOverdraftAtSameIndex = firstOverdraft && overdraftVisibility.isVisible && firstOverdraft.globalIndex === goal.globalIndex;
              const hasCreditLimitAtSameIndex = firstCreditLimit && creditLimitVisibility.isVisible && firstCreditLimit.globalIndex === goal.globalIndex;
              
              // Trouver les autres objectifs au même index
              const goalsAtSameIndex = allGoalsReached.filter(g => g.viewType === 'day' && g.globalIndex === goal.globalIndex);
              const indexInGroup = goalsAtSameIndex.findIndex(g => g.accountName === goal.accountName);
              
              // Calculer le décalage de base (en tenant compte des alertes découvert/crédit)
              let baseOffset = 50;
              if (hasOverdraftAtSameIndex && hasCreditLimitAtSameIndex) baseOffset = 66;
              else if (hasOverdraftAtSameIndex || hasCreditLimitAtSameIndex) baseOffset = 58;
              
              // Décaler chaque objectif supplémentaire
              const xOffset = baseOffset + (indexInGroup * 8) - ((goalsAtSameIndex.length - 1) * 4);
              
              bubbles.push(
                <div
                  key={`goal-reached-day-${goal.dateStr}-${goal.accountName}`}
                  className="goal-reached-bubble"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isTeleporting) return; // Bloquer si déjà en cours
                    
                    // Téléportation vers l'index de l'objectif atteint
                    teleportToIndex(
                      goal.globalIndex,
                      () => {
                        setNavGoalReachedPopup({
                          dateStr: goal.dateStr,
                          label: goal.dayLabel,
                          accountName: goal.accountName,
                          goalName: goal.goalName,
                          montantCible: goal.montantCible,
                          soldeAtteint: goal.montantCible
                        });
                      },
                      goal.viewType || 'day'
                    );
                  }}
                  style={{
                    position: 'absolute',
                    left: `${xOffset}%`,
                    top: `${grYPos}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${grBubbleSize}px`,
                    height: `${grBubbleSize}px`,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 30% 30%, rgba(76, 175, 80, 0.95), rgba(56, 142, 60, 0.9), rgba(27, 94, 32, 0.85))',
                    border: '3px solid rgba(165, 214, 167, 0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 52 + goalIdx,
                    boxShadow: '0 0 20px rgba(76, 175, 80, 0.7), 0 0 40px rgba(76, 175, 80, 0.4), inset 0 0 10px rgba(255,255,255,0.2)',
                    animation: 'goal-reached-pulse 1.5s ease-in-out infinite',
                    overflow: 'hidden'
                  }}
                >
                  <span style={{
                    fontSize: `${Math.max(18, grBubbleSize * 0.45)}px`
                  }}>⭐</span>
                </div>
              );
            });

            // 🆕 RENDU BULLES FANTÔMES - Budgets exclus (une bulle par type, en dehors des lignes)
            if ((whatIfMode === 'foundations' || whatIfMode === 'smartRoute') && (excludedBudgetsData.entrees.length > 0 || excludedBudgetsData.sorties.length > 0)) {
              const ghostBaseSize = 85;
              const ghostYPos = 75; // En bas, près de la ligne d'horizon
              
              // BULLE FANTÔME ENTRÉES (gauche) avec popup descriptions
              if (excludedBudgetsData.entrees.length > 0) {
                const totalExcludedEntrees = excludedBudgetsData.entrees.reduce((sum, e) => sum + (e.montant || 0), 0);
                bubbles.push(
                  <div
                    key="ghost-entrees-excluded"
                    className="ghost-bubble-container"
                    style={{
                      position: 'absolute',
                      left: '5%',
                      top: `${ghostYPos}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 5,
                      pointerEvents: 'auto'
                    }}
                  >
                    {/* Bulle principale */}
                    <div
                      style={{
                        width: `${ghostBaseSize}px`,
                        height: `${ghostBaseSize}px`,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, rgba(80, 80, 80, 0.5), rgba(60, 60, 60, 0.4))',
                        border: '2px dashed rgba(255,255,255,0.35)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.5,
                        filter: 'blur(0.8px)',
                        cursor: 'help',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                        e.currentTarget.style.filter = 'blur(0px)';
                        e.currentTarget.style.transform = 'scale(1.15)';
                        e.currentTarget.parentElement.querySelector('.ghost-popup').style.opacity = '1';
                        e.currentTarget.parentElement.querySelector('.ghost-popup').style.visibility = 'visible';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.5';
                        e.currentTarget.style.filter = 'blur(0.8px)';
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.parentElement.querySelector('.ghost-popup').style.opacity = '0';
                        e.currentTarget.parentElement.querySelector('.ghost-popup').style.visibility = 'hidden';
                      }}
                    >
                      <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', fontWeight: 'bold' }}>{excludedBudgetsData.entrees.length}</span>
                      <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', marginTop: '2px' }}>{formatMontant(totalExcludedEntrees)}</span>
                    </div>
                    {/* Popup descriptions - en bas */}
                    <div
                      className="ghost-popup"
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '100%',
                        transform: 'translateX(-50%)',
                        marginTop: '10px',
                        background: 'rgba(20, 20, 30, 0.95)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        minWidth: '180px',
                        maxWidth: '250px',
                        opacity: 0,
                        visibility: 'hidden',
                        transition: 'all 0.3s ease',
                        zIndex: 100,
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                      }}
                    >
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '9px', marginBottom: '6px', textTransform: 'uppercase' }}>Budgets exclus</div>
                      {excludedBudgetsData.entrees.map((e, idx) => (
                        <div key={idx} style={{ color: 'rgba(255,255,255,0.9)', fontSize: '11px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{e.description}</span>
                          <span style={{ color: '#3498db', marginLeft: '10px' }}>{formatMontant(e.montant || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              
              // BULLE FANTÔME SORTIES (droite)
              if (excludedBudgetsData.sorties.length > 0) {
                const totalExcludedSorties = excludedBudgetsData.sorties.reduce((sum, s) => sum + (s.montant || 0), 0);
                bubbles.push(
                  <div
                    key="ghost-sorties-excluded"
                    className="ghost-bubble-container"
                    style={{
                      position: 'absolute',
                      left: '95%',
                      top: `${ghostYPos}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 5,
                      pointerEvents: 'auto'
                    }}
                  >
                    {/* Bulle principale */}
                    <div
                      style={{
                        width: `${ghostBaseSize}px`,
                        height: `${ghostBaseSize}px`,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, rgba(80, 80, 80, 0.5), rgba(60, 60, 60, 0.4))',
                        border: '2px dashed rgba(255,255,255,0.35)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.5,
                        filter: 'blur(0.8px)',
                        cursor: 'help',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                        e.currentTarget.style.filter = 'blur(0px)';
                        e.currentTarget.style.transform = 'scale(1.15)';
                        e.currentTarget.parentElement.querySelector('.ghost-popup-right').style.opacity = '1';
                        e.currentTarget.parentElement.querySelector('.ghost-popup-right').style.visibility = 'visible';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.5';
                        e.currentTarget.style.filter = 'blur(0.8px)';
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.parentElement.querySelector('.ghost-popup-right').style.opacity = '0';
                        e.currentTarget.parentElement.querySelector('.ghost-popup-right').style.visibility = 'hidden';
                      }}
                    >
                      <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', fontWeight: 'bold' }}>{excludedBudgetsData.sorties.length}</span>
                      <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', marginTop: '2px' }}>{formatMontant(totalExcludedSorties)}</span>
                    </div>
                    {/* Popup descriptions - en bas */}
                    <div
                      className="ghost-popup-right"
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '100%',
                        transform: 'translateX(-50%)',
                        marginTop: '10px',
                        background: 'rgba(20, 20, 30, 0.95)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        minWidth: '180px',
                        maxWidth: '250px',
                        opacity: 0,
                        visibility: 'hidden',
                        transition: 'all 0.3s ease',
                        zIndex: 100,
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                      }}
                    >
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '9px', marginBottom: '6px', textTransform: 'uppercase' }}>Budgets exclus</div>
                      {excludedBudgetsData.sorties.map((s, idx) => (
                        <div key={idx} style={{ color: 'rgba(255,255,255,0.9)', fontSize: '11px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{s.description}</span>
                          <span style={{ color: '#ff9800', marginLeft: '10px' }}>{formatMontant(s.montant || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            }

            return bubbles;
          })()}
          
          {/* BULLES DU JOUR ACTUEL - Désactivées temporairement */}
          {false && todayBubbles.map((bubble) => (
            <div
              key={bubble.id}
              className={`bubble ${bubble.type === 'entree' ? 'bubble-entry' : 'bubble-expense'}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBubble({
                  id: bubble.id,
                  type: bubble.type,
                  dayLabel: currentDay?.label,
                  daysAway: 0,
                  transactions: [{ description: bubble.description, montant: bubble.montant, compte: bubble.compte }],
                  total: bubble.montant,
                  count: 1
                });
              }}
              style={{
                left: `${bubble.x}%`,
                top: `${bubble.y}%`,
                transform: 'translate(-50%, -50%)',
                width: `${Math.min(bubble.size, 100)}px`,
                height: `${Math.min(bubble.size, 100)}px`,
                borderRadius: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 15,
                boxShadow: bubble.type === 'entree' 
                  ? '0 0 20px rgba(76, 175, 80, 0.6)' 
                  : '0 0 20px rgba(255, 152, 0, 0.6)'
              }}
            >
              <div style={{ 
                color: 'white', 
                fontSize: '0.6em', 
                fontWeight: 'bold',
                textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                textAlign: 'center',
                padding: '0 4px',
                maxWidth: '90%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {bubble.description}
              </div>
              <div style={{ 
                color: 'white', 
                fontSize: '0.8em', 
                fontWeight: 'bold',
                textShadow: '0 1px 2px rgba(0,0,0,0.7)'
              }}>
                {getTransactionSign(bubble.type, bubble.compte)}{formatMontant(bubble.montant)}
              </div>
            </div>
          ))}
          
          {/* BULLES FUTURES - Désactivées temporairement */}
          {false && bubbles.map((bubble) => {
            // Taille proportionnelle à la distance (plus proche = plus grand)
            const size = 30 + (bubble.scale * 60) + bubble.sizeBonus;
            
            return (
              <div
                key={bubble.id}
                className={`bubble ${bubble.type === 'entree' ? 'bubble-entry' : 'bubble-expense'}${dropAnimationActive ? ' bubble-drop' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBubble(bubble);
                }}
                style={{
                  // v12: Position absolue avec left pour les entrées
                  left: `${bubble.xPercent}%`,
                  top: `${bubble.yPercent}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  opacity: dropAnimationActive ? 0 : bubble.opacity, // Commençe invisible si animation active
                  zIndex: Math.round(bubble.scale * 10),
                  animationDelay: dropAnimationActive ? `${bubble.idx * 0.15}s` : `${bubble.idx * 0.2}s`, // Délai en cascade pour drop
                  borderRadius: '50%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: bubble.type === 'entree' 
                    ? `0 0 ${15 * bubble.scale}px rgba(76, 175, 80, 0.5)` 
                    : `0 0 ${15 * bubble.scale}px rgba(255, 152, 0, 0.5)`
                }}
              >
                <div style={{ 
                  color: 'white', 
                  fontSize: `${0.5 + (bubble.scale * 0.15)}em`, 
                  fontWeight: 'bold',
                  textShadow: '0 1px 2px rgba(0,0,0,0.7)'
                }}>
                  {formatDelay(bubble.daysAway)}
                </div>
                <div style={{ 
                  color: 'white', 
                  fontSize: `${0.65 + (bubble.scale * 0.2)}em`, 
                  fontWeight: 'bold',
                  textShadow: '0 1px 2px rgba(0,0,0,0.7)'
                }}>
                  {getTransactionSign(bubble.type, bubble.transactions?.[0]?.compte)}{formatMontant(bubble.total)}
                </div>
                
                {bubble.count > 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    background: 'white',
                    color: bubble.type === 'entree' ? '#3498db' : '#ff9800',
                    width: `${14 + (bubble.scale * 4)}px`,
                    height: `${14 + (bubble.scale * 4)}px`,
                    borderRadius: '50%',
                    fontSize: '0.55em',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {bubble.count}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* ⚠️ POPUP DÉCOUVERT NAVIGATION */}
          {navOverdraftPopup && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{
                background: 'white',
                borderRadius: '24px',
                padding: '0',
                maxWidth: '450px',
                width: '90%',
                overflow: 'hidden',
                boxShadow: '0 25px 80px rgba(156, 39, 176, 0.4)',
                animation: 'bounceIn 0.3s ease'
              }}>
                {/* Header Violet */}
                <div style={{
                  background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
                  padding: '25px 30px',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255,255,255,0.2)',
                    animation: 'pulse-alert 1.5s ease-in-out infinite'
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '2.5em' }}>⚠️</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold' }}>
                          {t('gps.overdraftAlert.title')}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenu */}
                <div style={{ padding: '25px 30px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                    border: '2px solid #9c27b0',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '20px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.95em', color: '#6a1b9a' }}>
                      {t('gps.overdraftAlert.message', {
                        amount: formatMontant(Math.abs(navOverdraftPopup.amount)),
                        date: navOverdraftPopup.label
                      })}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85em', color: '#7f8c8d' }}>
                      💳 {navOverdraftPopup.accountName}
                    </p>
                  </div>

                  <p style={{
                    margin: '0 0 20px',
                    fontSize: '0.95em',
                    color: '#64748b',
                    textAlign: 'center'
                  }}>
                    {t('gps.overdraftAlert.suggestion')}
                  </p>

                  {/* Boutons */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setNavOverdraftPopup(null)}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '12px',
                        border: '2px solid #e0e0e0',
                        background: 'white',
                        color: '#7f8c8d',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.9em'
                      }}
                    >
                      {t('gps.overdraftAlert.dismiss')}
                    </button>
                    <button
                      onClick={() => {
                        setNavOverdraftPopup(null);
                        // Naviguer vers la date du découvert
                        if (perspectiveView === 'day' && firstOverdraft) {
                          const targetIndex = navigationDays.findIndex(d => d.dateStr === firstOverdraft.dateStr);
                          if (targetIndex !== -1) {
                            setNavIndex(Math.max(0, targetIndex - 1));
                          }
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
                        color: 'white',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.9em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      📅 {t('gps.overdraftAlert.viewDetails')}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setNavOverdraftPopup(null);
                      setIsFullScreen(false);
                      navigate('/budget');
                    }}
                    style={{
                      width: '100%',
                      marginTop: '12px',
                      padding: '14px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)',
                      color: 'white',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '0.95em',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    🛠️ {t('gps.overdraftAlert.adjustBudget')}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* 🏦 POPUP LIMITE CRÉDIT NAVIGATION */}
          {navCreditLimitPopup && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{
                background: 'white',
                borderRadius: '24px',
                padding: '0',
                maxWidth: '450px',
                width: '90%',
                overflow: 'hidden',
                boxShadow: '0 25px 80px rgba(156, 39, 176, 0.4)',
                animation: 'bounceIn 0.3s ease'
              }}>
                {/* Header Violet */}
                <div style={{
                  background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
                  padding: '25px 30px',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255,255,255,0.2)',
                    animation: 'pulse-alert 1.5s ease-in-out infinite'
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '2.5em' }}>⚠️</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold' }}>
                          {t('gps.creditLimitAlert.title', 'Limite de crédit atteinte!')}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenu */}
                <div style={{ padding: '25px 30px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                    border: '2px solid #9c27b0',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '20px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.95em', color: '#6a1b9a' }}>
                      {t('gps.creditLimitAlert.message', {
                        amount: formatMontant(navCreditLimitPopup.solde),
                        limit: formatMontant(navCreditLimitPopup.limite),
                        date: navCreditLimitPopup.label
                      }, `Solde prévu: ${formatMontant(navCreditLimitPopup.solde)} (limite: ${formatMontant(navCreditLimitPopup.limite)}) le ${navCreditLimitPopup.label}`)}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85em', color: '#7f8c8d' }}>
                      ⚠️ {navCreditLimitPopup.accountName}
                    </p>
                  </div>

                  <p style={{
                    margin: '0 0 20px',
                    fontSize: '0.95em',
                    color: '#64748b',
                    textAlign: 'center'
                  }}>
                    <strong style={{ color: '#9c27b0' }}>{t('common.recommendation', 'Recommandation')}:</strong> {t('gps.creditLimitAlert.suggestion', 'Révisez vos dépenses ou augmentez vos paiements pour éviter de dépasser votre limite.')}
                  </p>

                  {/* Boutons */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setNavCreditLimitPopup(null)}
                      style={{
                        flex: '1 1 calc(33% - 8px)',
                        minWidth: '120px',
                        padding: '14px',
                        borderRadius: '12px',
                        border: '2px solid #e0e0e0',
                        background: 'white',
                        color: '#7f8c8d',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.9em'
                      }}
                    >
                      {t('common.close', 'Fermer')}
                    </button>
                    <button
                      onClick={() => {
                        setNavCreditLimitPopup(null);
                        setIsFullScreen(false);
                        navigate('/comptes');
                      }}
                      style={{
                        flex: '1 1 calc(33% - 8px)',
                        minWidth: '120px',
                        padding: '14px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                        color: 'white',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.9em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      💼 {t('gps.creditLimitAlert.updatePortfolio', 'Portefeuille')}
                    </button>
                    <button
                      onClick={() => {
                        setNavCreditLimitPopup(null);
                        setIsFullScreen(false);
                        navigate('/budget');
                      }}
                      style={{
                        flex: '1 1 calc(33% - 8px)',
                        minWidth: '120px',
                        padding: '14px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
                        color: 'white',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.9em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      🛠️ {t('gps.overdraftAlert.adjustBudget', 'Ajuster budget')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* ⭐ POPUP OBJECTIF ATTEINT NAVIGATION */}
          {navGoalReachedPopup && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{
                background: 'white',
                borderRadius: '24px',
                padding: '0',
                maxWidth: '450px',
                width: '90%',
                overflow: 'hidden',
                boxShadow: '0 25px 80px rgba(76, 175, 80, 0.4)',
                animation: 'bounceIn 0.3s ease'
              }}>
                {/* Header Vert */}
                <div style={{
                  background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                  padding: '25px 30px',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255,255,255,0.2)',
                    animation: 'pulse-alert 1.5s ease-in-out infinite'
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '2.5em' }}>⭐</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold' }}>
                          {t('gps.goalReachedAlert.title', 'Objectif atteint!')}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenu */}
                <div style={{ padding: '25px 30px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                    border: '2px solid #4caf50',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '20px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px', fontSize: '1.1em', color: '#2e7d32', fontWeight: 'bold' }}>
                      🎯 {navGoalReachedPopup.goalName}
                    </p>
                    <p style={{ margin: '0 0 8px', fontSize: '0.95em', color: '#388e3c' }}>
                      {t('gps.goalReachedAlert.message', {
                        amount: formatMontant(navGoalReachedPopup.montantCible),
                        date: navGoalReachedPopup.label
                      }, `Tu atteindras ${formatMontant(navGoalReachedPopup.montantCible)} le ${navGoalReachedPopup.label}`)}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85em', color: '#7f8c8d' }}>
                      💳 {navGoalReachedPopup.accountName}
                    </p>
                  </div>

                  <p style={{
                    margin: '0 0 20px',
                    fontSize: '0.95em',
                    color: '#64748b',
                    textAlign: 'center'
                  }}>
                    {t('gps.goalReachedAlert.suggestion', 'Félicitations d\'avance! ⭐')}
                  </p>

                  {/* Boutons */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setNavGoalReachedPopup(null)}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '12px',
                        border: '2px solid #e0e0e0',
                        background: 'white',
                        color: '#7f8c8d',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.9em'
                      }}
                    >
                      {t('common.close', 'Fermer')}
                    </button>
                    <button
                      onClick={() => setNavGoalReachedPopup(null)}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                        color: 'white',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.9em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      🎉 {t('gps.goalReachedAlert.celebrate', 'Célébrer!')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}          
          {/* POPUP MAUVAISE DIRECTION - Avertissement orange */}
          {navWrongDirectionPopup && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{
                background: 'white',
                borderRadius: '24px',
                padding: '0',
                maxWidth: '450px',
                width: '90%',
                overflow: 'hidden',
                boxShadow: '0 25px 80px rgba(255, 152, 0, 0.4)',
                animation: 'bounceIn 0.3s ease'
              }}>
                {/* Header Orange */}
                <div style={{
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  padding: '25px 30px',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255,255,255,0.2)',
                    animation: 'pulse-alert 1.5s ease-in-out infinite'
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '2.5em' }}>⛔</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold' }}>
                          {t('gps.wrongDirectionAlert.title', 'Attention - Mauvaise direction!')}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenu */}
                <div style={{ padding: '25px 30px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                    border: '2px solid #ff9800',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '20px'
                  }}>
                    <p style={{ margin: '0 0 12px', fontSize: '1.1em', color: '#e65100', fontWeight: 'bold', textAlign: 'center' }}>
                      🎯 {navWrongDirectionPopup.goalName}
                    </p>
                    <p style={{ margin: '0 0 8px', fontSize: '0.9em', color: '#f57c00', textAlign: 'center' }}>
                      💳 {navWrongDirectionPopup.accountName}
                    </p>
                    
                    {/* Stats sorties vs entrées */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-around',
                      marginTop: '15px',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.7)',
                      borderRadius: '12px'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75em', color: '#7f8c8d', marginBottom: '4px' }}>
                          {t('gps.wrongDirectionAlert.monthlyIn', 'Entrées/mois')}
                        </div>
                        <div style={{ fontSize: '1.1em', color: '#4caf50', fontWeight: 'bold' }}>
                          +{formatMontant(navWrongDirectionPopup.entreesParMois || 0)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75em', color: '#7f8c8d', marginBottom: '4px' }}>
                          {t('gps.wrongDirectionAlert.monthlyOut', 'Sorties/mois')}
                        </div>
                        <div style={{ fontSize: '1.1em', color: '#f44336', fontWeight: 'bold' }}>
                          -{formatMontant(navWrongDirectionPopup.sortiesParMois || 0)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Barre de progression */}
                    <div style={{ marginTop: '15px' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8em',
                        color: '#7f8c8d',
                        marginBottom: '6px'
                      }}>
                        <span>{t('gps.wrongDirectionAlert.progress', 'Progression')}</span>
                        <span>{Math.round(navWrongDirectionPopup.progression || 0)}%</span>
                      </div>
                      <div style={{
                        height: '8px',
                        background: '#e0e0e0',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, navWrongDirectionPopup.progression || 0)}%`,
                          background: 'linear-gradient(90deg, #ff9800, #f57c00)',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Conseil personnalisé */}
                  <p style={{
                    margin: '0 0 20px',
                    fontSize: '0.95em',
                    color: '#64748b',
                    textAlign: 'center',
                    lineHeight: '1.5'
                  }}>
                    {navWrongDirectionPopup.isCredit 
                      ? t('gps.wrongDirectionAlert.adviceCredit', 'Les sorties dépassent les entrées. Réduis tes dépenses sur ce compte pour rembourser ta dette plus vite.')
                      : t('gps.wrongDirectionAlert.adviceSavings', 'Les sorties dépassent les entrées. Réduis tes dépenses ou augmente tes revenus pour atteindre ton objectif d\'épargne.')
                    }
                  </p>

                  {/* Boutons */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => {
                        setNavWrongDirectionPopup(null);
                        setIsFullScreen(false);
                        navigate('/budget');
                      }}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '12px',
                        border: '2px solid #ff9800',
                        background: 'white',
                        color: '#f57c00',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.9em'
                      }}
                    >
                      📊 {t('gps.wrongDirectionAlert.reviewBudget', 'Revoir le Budget')}
                    </button>
                    <button
                      onClick={() => {
                        // Ajouter l'objectif aux alertes ignorées
                        setDismissedWrongDirections(prev => new Set([...prev, navWrongDirectionPopup.goalName]));
                        setNavWrongDirectionPopup(null);
                      }}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                        color: 'white',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.9em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      ✅ {t('gps.wrongDirectionAlert.understood', 'Compris')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* MODAL DÉTAILS */}
          {selectedBubble && (
            <>
              <div 
                onClick={() => setSelectedBubble(null)}
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.7)',
                  zIndex: 999,
                  animation: 'backdrop-fade 0.2s ease-out forwards'
                }}
              />
              
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'linear-gradient(135deg, #1a1a4e 0%, #0d0d2b 100%)',
                  border: `2px solid ${selectedBubble.type === 'entree' ? '#3498db' : '#ff9800'}`,
                  borderRadius: '20px',
                  padding: '25px',
                  minWidth: '320px',
                  maxWidth: '400px',
                  zIndex: 1000,
                  animation: 'modal-zoom-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                  boxShadow: '0 25px 80px rgba(0,0,0,0.5)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                  paddingBottom: '15px',
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div>
                    <div style={{ color: 'white', fontSize: '1.1em', fontWeight: 'bold' }}>
                      📅 {selectedBubble.dayLabel}
                    </div>
                    <div style={{ 
                      color: selectedBubble.type === 'entree' ? '#3498db' : '#ff9800',
                      fontSize: '0.85em'
                    }}>
                      {formatDelay(selectedBubble.daysAway)} • {selectedBubble.count} {selectedBubble.count > 1 ? t('gps.navigation.transactions') : t('gps.navigation.transaction')}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBubble(null)}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '35px',
                      height: '35px',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >✕</button>
                </div>
                
                <div className={`modal-scroll-${selectedBubble.type === 'entree' ? 'entree' : 'sortie'}`} style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' }}>
                  {selectedBubble.transactions.map((tx, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '10px',
                        marginBottom: '8px',
                        borderLeft: `3px solid ${selectedBubble.type === 'entree' ? '#3498db' : '#ff9800'}`
                      }}
                    >
                      <div>
                        <div style={{ color: 'white', fontWeight: '600' }}>{tx.description}</div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8em' }}>→ {tx.compte}</div>
                      </div>
                      <div style={{
                        color: selectedBubble.type === 'entree' ? '#3498db' : '#ff9800',
                        fontWeight: 'bold'
                      }}>
                        {getTransactionSign(selectedBubble.type, tx.compte)}{formatMontant(tx.montant)}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div style={{
                  marginTop: '15px',
                  paddingTop: '15px',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{t('gps.navigation.total')}</span>
                  <span style={{
                    color: selectedBubble.type === 'entree' ? '#3498db' : '#ff9800',
                    fontSize: '1.2em',
                    fontWeight: 'bold'
                  }}>
                    {getTransactionSign(selectedBubble.type, selectedBubble.transactions?.[0]?.compte)}{formatMontant(selectedBubble.total)}
                  </span>
                </div>
              </div>
            </>
          )}
          
        </div>
        
        {/* BAS DE L'ÉCRAN - Comptes + Contrôles */}
        <div style={{
          background: 'transparent',
          // Mobile Web: padding plus grand en bas pour compenser la barre du navigateur
          // Mobile PWA: padding normal (pas de barre)
          padding: isMobile 
            ? (isPWA ? '10px 20px 15px' : '10px 20px 45px') 
            : '10px 20px 15px',
          zIndex: 5
        }}>
          {/* Ligne 1: Contrôles - Boutons de mode sur mobile */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '12px',
            height: isMobile ? 'auto' : '35px',
            gap: '10px'
          }}>
            {/* Boutons de mode UNIQUEMENT sur mobile */}
            {isMobile && (
              <>
                {/* Titre du mode actuel */}
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  background: whatIfMode === 'foundations' 
                    ? 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)'
                    : whatIfMode === 'smartRoute'
                      ? 'linear-gradient(135deg, #00bcd4 0%, #0097a7 100%)'
                      : 'linear-gradient(135deg, #040449 0%, #100261 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8em',
                  fontWeight: 'bold',
                  boxShadow: whatIfMode === 'foundations'
                    ? '0 4px 15px rgba(46, 204, 113, 0.4)'
                    : whatIfMode === 'smartRoute'
                      ? '0 4px 15px rgba(0, 188, 212, 0.4)'
                      : '0 4px 15px rgba(4, 4, 73, 0.4)',
                  border: '2px solid rgba(255,255,255,0.3)'
                }}>
                  {whatIfMode === 'foundations' ? '⚓' : whatIfMode === 'smartRoute' ? '⭐' : '🧭'}
                  {whatIfMode === 'foundations' 
                    ? t('gps.foundations.title', 'Les Fondations') 
                    : whatIfMode === 'smartRoute'
                      ? t('gps.smartRoute.title', 'Smart Route')
                      : t('gps.pilotAuto.title', 'Pilote Auto')}
                </div>
                
                {/* Boutons de navigation entre modes */}
                {!whatIfMode ? (
                  // Mode Pilote Auto: boutons vers Fondations et Smart Route
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/gps/fondations?fullscreen=true');
                      }}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(46, 204, 113, 0.6) 0%, rgba(39, 174, 96, 0.6) 100%)',
                        border: '2px solid rgba(255,255,255,0.3)',
                        color: 'white',
                        fontSize: '1em',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ⚓
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/gps/smart-route?fullscreen=true');
                      }}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.6) 0%, rgba(0, 151, 167, 0.6) 100%)',
                        border: '2px solid rgba(255,255,255,0.3)',
                        color: 'white',
                        fontSize: '1em',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ⭐
                    </button>
                  </>
                ) : (
                  // Modes Fondations/Smart Route: bouton retour Pilote Auto
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/gps?fullscreen=true');
                    }}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(4, 4, 73, 0.6) 0%, rgba(16, 2, 97, 0.6) 100%)',
                      border: '2px solid rgba(255,255,255,0.3)',
                      color: 'white',
                      fontSize: '1em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    🧭
                  </button>
                )}
              </>
            )}
          </div>
          
          {/* Ligne 2: Comptes - Plus grands et proches de la ligne */}
          <div style={{
            display: isMobile ? 'grid' : 'flex',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'none',
            justifyContent: 'center',
            gap: isMobile ? '10px' : '12px',
            flexWrap: 'wrap',
            marginTop: isMobile ? '0' : '-20px',
            padding: isMobile ? '0 10px' : '0'
          }}>
            {accounts.map((account) => {
              // Utiliser les données de l'année, du mois ou du jour selon la vue
              const accountData = perspectiveView === 'year'
                ? currentNavYear?.accounts?.[account.nom]
                : perspectiveView === 'month' 
                  ? currentNavMonth?.accounts?.[account.nom]
                  : currentDay?.accounts?.[account.nom];
              
              // Pour la vue année/mois, utiliser soldeFin
              const solde = (perspectiveView === 'year' || perspectiveView === 'month')
                ? (accountData?.soldeFin || 0)
                : (accountData?.solde || 0);
              
              const isCredit = account.type === 'credit' || account.type === 'hypotheque' || account.type === 'marge';
              
              // Vérifier si ce compte a des transactions
              const hasEntrees = accountData?.entrees?.length > 0;
              const hasSorties = accountData?.sorties?.length > 0;
              const hasActivity = hasEntrees || hasSorties;
              
              // Vérifier si CE compte a atteint sa limite de crédit (gère plusieurs comptes)
              const hasOwnCreditLimit = isCredit && account.limite && account.limite > 0;
              const currentSolde = solde;
              const hasReachedOwnLimit = hasOwnCreditLimit && currentSolde >= account.limite;
              
              // Trouver la date où CE compte spécifique a dépassé sa limite
              const ownCreditLimitDate = hasOwnCreditLimit ? (() => {
                if (perspectiveView === 'day') {
                  for (let i = 0; i < navigationDays.length; i++) {
                    const day = navigationDays[i];
                    const accData = day.accounts?.[account.nom];
                    if (accData && accData.solde >= account.limite) {
                      return day.dateStr;
                    }
                  }
                }
                return null;
              })() : null;
              
              // L'effet flou s'applique seulement APRÈS la date de dépassement pour CE compte
              const isAfterCreditLimitDate = ownCreditLimitDate && currentDay?.dateStr && currentDay.dateStr >= ownCreditLimitDate;
              
              // 🆕 Vérifier si ce compte crédit est exclu en mode What-If
              // (tous ses budgets sont exclus car variable/semi-variable)
              const isExcludedInWhatIf = whatIfMode && isCredit && (() => {
                // Trouver les budgets liés à ce compte
                const accountBudgets = [...baseBudgetEntrees, ...baseBudgetSorties].filter(b => b.compte === account.nom);
                if (accountBudgets.length === 0) return true; // Pas de budget = exclu
                
                // Vérifier si tous les budgets sont exclus selon le mode
                if (whatIfMode === 'foundations') {
                  // Fondations: seuls les 'fixed' sont inclus
                  return accountBudgets.every(b => b.flexibility !== 'fixed');
                } else if (whatIfMode === 'smartRoute') {
                  // Smart Route: 'fixed' et 'semi-fixed' sont inclus
                  return accountBudgets.every(b => b.flexibility !== 'fixed' && b.flexibility !== 'semi-fixed');
                }
                return false;
              })();
              
              return (
                <div
                  key={account.nom}
                  className={hasActivity ? 'account-pulse' : ''}
                  style={{
                    background: whatIfMode === 'foundations'
                      ? 'linear-gradient(135deg, rgba(10,31,10,0.95) 0%, rgba(13,40,24,0.95) 100%)'
                      : whatIfMode === 'smartRoute'
                        ? 'linear-gradient(135deg, rgba(0,26,31,0.95) 0%, rgba(0,40,48,0.95) 100%)'
                        : (isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.95)'),
                    borderRadius: isMobile ? '12px' : '16px',
                    padding: isMobile ? '12px 15px' : '18px 30px',
                    minWidth: isMobile ? 'auto' : '180px',
                    textAlign: 'center',
                    backdropFilter: 'blur(15px)',
                    border: isAfterCreditLimitDate
                      ? '2px solid #9c27b0'
                      : isExcludedInWhatIf
                        ? (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.1)')
                        : hasActivity 
                          ? `2px solid ${hasEntrees ? '#3498db' : '#ff9800'}` 
                          : (whatIfMode ? '1px solid rgba(255,255,255,0.15)' : (isDark ? '1px solid rgba(255,255,255,0.15)' : '2px solid rgba(102, 126, 234, 0.3)')),
                    boxShadow: isAfterCreditLimitDate
                      ? '0 0 20px rgba(156, 39, 176, 0.6), 0 0 40px rgba(156, 39, 176, 0.3)'
                      : isExcludedInWhatIf
                        ? '0 4px 15px rgba(0,0,0,0.2)'
                        : hasActivity 
                          ? `0 0 20px ${hasEntrees ? 'rgba(52,152,219,0.4)' : 'rgba(255,152,0,0.4)'}` 
                          : (whatIfMode ? '0 4px 15px rgba(0,0,0,0.3)' : (isDark ? '0 4px 15px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.1)')),
                    filter: isAfterCreditLimitDate ? 'brightness(0.7)' : isExcludedInWhatIf ? 'blur(1px) brightness(0.6)' : 'none',
                    opacity: isAfterCreditLimitDate ? 0.85 : isExcludedInWhatIf ? 0.5 : 1,
                    transition: 'all 0.4s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Effet de particules pour activité */}
                  {hasActivity && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: hasEntrees 
                        ? 'linear-gradient(180deg, rgba(52,152,219,0.15) 0%, transparent 50%)'
                        : 'linear-gradient(180deg, rgba(255,152,0,0.15) 0%, transparent 50%)',
                      pointerEvents: 'none'
                    }} />
                  )}
                  
                  <div style={{ fontSize: isMobile ? '1.2em' : '1.5em', marginBottom: isMobile ? '4px' : '6px' }}>{getAccountIcon(account.type)}</div>
                  {(() => {
                    const isAnimating = navAnimatingAccounts[account.nom] !== undefined;
                    const displayValue = isAnimating ? navAnimatingAccounts[account.nom] : solde;
                    
                    return (
                      <div 
                        className={isAnimating ? 'montant-counting' : ''}
                        style={{
                          color: whatIfMode 
                            ? (isCredit ? '#ff9800' : '#3498db')
                            : (isDark 
                              ? (isCredit ? '#ff9800' : '#3498db')
                              : (isCredit ? '#ff9800' : '#1e5f8a')),
                          fontSize: isMobile ? '1.3em' : '1.9em',
                          fontWeight: 'bold',
                          textShadow: (whatIfMode || isDark) ? '0 2px 6px rgba(0,0,0,0.5)' : 'none',
                          fontFamily: 'monospace',
                          letterSpacing: isMobile ? '0' : '1px',
                          lineHeight: '1.2'
                        }}
                      >
                        {formatMontant(displayValue)}
                      </div>
                    );
                  })()}
                  <div style={{ 
                    color: whatIfMode 
                      ? 'rgba(255,255,255,0.9)'
                      : (isDark ? 'rgba(255,255,255,0.9)' : '#1e293b'), 
                    fontSize: isMobile ? '0.75em' : '0.85em', 
                    fontWeight: 'bold',
                    textShadow: (whatIfMode || isDark) ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                    marginTop: isMobile ? '2px' : '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {account.nom}
                  </div>
                  
                  {/* Indicateur d'activité */}
                  {hasActivity && (
                    <div style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: hasEntrees ? '#3498db' : '#ff9800',
                      animation: 'pulse-dot 1.5s ease-in-out infinite'
                    }} />
                  )}
                  
                  {/* ⚠️ INDICATEUR DÉCOUVERT - Visible quand bulle hors écran */}
                  {firstOverdraft && !overdraftVisibility.isVisible && firstOverdraft.accountName === account.nom && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        // ✅ Bloquer pendant le guide
                        if (showGuide || showContinueBar) return;
                        if (isTeleporting) return; // Bloquer si déjà en cours
                        
                        console.log('[TELEPORT COMPTE] Clic sur indicateur ⚠️ découvert:', account.nom);
                        
                        // Téléportation vers la date du découvert
                        teleportToIndex(
                          firstOverdraft.globalIndex,
                          () => {
                            setNavOverdraftPopup({
                              dateStr: firstOverdraft.dateStr,
                              label: firstOverdraft.dayLabel,
                              accountName: firstOverdraft.accountName,
                              amount: firstOverdraft.amount
                            });
                          },
                          firstOverdraft.viewType || perspectiveView
                        );
                      }}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
                        border: '2px solid rgba(206, 147, 216, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: (showGuide || showContinueBar) ? 'not-allowed' : 'pointer',
                        opacity: (showGuide || showContinueBar) ? 0.5 : 1,
                        zIndex: 10,
                        boxShadow: '0 0 10px rgba(156, 39, 176, 0.6)',
                        animation: 'overdraft-indicator-pulse 1.5s ease-in-out infinite'
                      }}
                    >
                      <span style={{ fontSize: '11px' }}>⚠️</span>
                    </div>
                  )}
                  
                  {/* 🏦 INDICATEUR LIMITE CRÉDIT - Visible quand bulle hors écran */}
                  {(() => {
                    const accountCreditLimit = allCreditLimits[account.nom];
                    if (!accountCreditLimit) return null;
                    
                    // Calculer la visibilité pour CE compte
                    const windowSize = 4;
                    const currentIndex = perspectiveView === 'day' ? navIndex : perspectiveView === 'month' ? navMonthIndex : navYearIndex;
                    const maxIndex = currentIndex + windowSize;
                    const isLimitVisible = accountCreditLimit.globalIndex >= currentIndex && accountCreditLimit.globalIndex < maxIndex;
                    
                    if (isLimitVisible) return null;
                    
                    return (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (showGuide || showContinueBar) return;
                        if (isTeleporting) return;
                        
                        console.log('[TELEPORT COMPTE] Clic sur indicateur ⚠️ limite crédit:', account.nom);
                        
                        teleportToIndex(
                          accountCreditLimit.globalIndex,
                          () => {
                            setNavCreditLimitPopup({
                              dateStr: accountCreditLimit.dateStr,
                              label: accountCreditLimit.dayLabel,
                              accountName: accountCreditLimit.accountName,
                              solde: accountCreditLimit.solde,
                              limite: accountCreditLimit.limite
                            });
                          },
                          accountCreditLimit.viewType || perspectiveView
                        );
                      }}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: firstOverdraft && !overdraftVisibility.isVisible && firstOverdraft.accountName === account.nom ? '30px' : '4px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
                        border: '2px solid rgba(206, 147, 216, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: (showGuide || showContinueBar) ? 'not-allowed' : 'pointer',
                        opacity: (showGuide || showContinueBar) ? 0.5 : 1,
                        zIndex: 10,
                        boxShadow: '0 0 10px rgba(156, 39, 176, 0.6)',
                        animation: 'credit-limit-indicator-pulse 1.5s ease-in-out infinite'
                      }}
                    >
                      <span style={{ fontSize: '11px' }}>⚠️</span>
                    </div>
                    );
                  })()}
                  
                  {/* ⭐ INDICATEUR OBJECTIF ATTEINT - Visible quand bulle hors écran et navigation avant l'objectif */}
                  {(() => {
                    const goalInfo = getGoalVisibility(account.nom);
                    if (!goalInfo.hasGoal || goalInfo.isVisible) return null;
                    
                    // Vérifier si l'utilisateur a dépassé la date de l'objectif en naviguant
                    let currentNavIndex;
                    if (perspectiveView === 'day') {
                      currentNavIndex = navIndex;
                    } else if (perspectiveView === 'month') {
                      currentNavIndex = navMonthIndex;
                    } else {
                      currentNavIndex = navYearIndex;
                    }
                    
                    // Si la navigation actuelle est AU-DELÀ de l'objectif, ne pas afficher l'indicateur
                    // (l'utilisateur a dépassé la date de l'objectif)
                    if (currentNavIndex > goalInfo.goal.globalIndex) return null;
                    
                    return (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          // ✅ Bloquer pendant le guide
                          if (showGuide || showContinueBar) return;
                          if (isTeleporting) return; // Bloquer si déjà en cours
                          
                          // Téléportation vers la date de l'objectif avec défilement animé
                          if (goalInfo.goal) {
                            console.log('[TELEPORT COMPTE] Clic sur indicateur ⭐ compte:', account.nom);
                            console.log('[TELEPORT COMPTE] Goal:', goalInfo.goal);
                            
                            teleportToIndex(
                              goalInfo.goal.globalIndex,
                              () => {
                                setNavGoalReachedPopup({
                                  dateStr: goalInfo.goal.dateStr,
                                  label: goalInfo.goal.dayLabel,
                                  accountName: goalInfo.goal.accountName,
                                  goalName: goalInfo.goal.goalName,
                                  montantCible: goalInfo.goal.montantCible,
                                  soldeAtteint: goalInfo.goal.montantCible
                                });
                              },
                              goalInfo.goal.viewType || perspectiveView
                            );
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          left: '4px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                          border: '2px solid rgba(165, 214, 167, 0.8)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 10,
                          boxShadow: '0 0 10px rgba(76, 175, 80, 0.6)',
                          animation: 'goal-reached-indicator-pulse 1.5s ease-in-out infinite'
                        }}
                      >
                        <span style={{ fontSize: '11px' }}>⭐</span>
                      </div>
                    );
                  })()}
                  
                  {/* ⛔ INDICATEUR MAUVAISE DIRECTION - Visible quand objectif va dans le mauvais sens */}
                  {(() => {
                    const wrongDirection = getWrongDirectionForAccount(account.nom);
                    if (!wrongDirection) return null;
                    
                    // Vérifier si l'utilisateur a ignoré cette alerte
                    if (dismissedWrongDirections.has(wrongDirection.goalName)) return null;
                    
                    // Calculer le décalage si d'autres indicateurs sont présents
                    const goalInfo = getGoalVisibility(account.nom);
                    const hasGoalIndicator = goalInfo.hasGoal && !goalInfo.isVisible;
                    let leftOffset = 4;
                    if (hasGoalIndicator) leftOffset = 30; // Décaler si étoile présente
                    
                    return (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          // ✅ Bloquer pendant le guide
                          if (showGuide || showContinueBar) return;
                          setNavWrongDirectionPopup(wrongDirection);
                        }}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          left: `${leftOffset}px`,
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                          border: '2px solid rgba(255, 224, 178, 0.8)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: (showGuide || showContinueBar) ? 'not-allowed' : 'pointer',
                          opacity: (showGuide || showContinueBar) ? 0.5 : 1,
                          zIndex: 11,
                          boxShadow: '0 0 10px rgba(255, 152, 0, 0.6)',
                          animation: 'wrong-direction-indicator-pulse 1.5s ease-in-out infinite'
                        }}
                      >
                        <span style={{ fontSize: '11px' }}>⛔</span>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
          
          {/* Hint de scroll masqué */}
        </div>
        
        <PageGuideModal
          isOpen={showGuide}
          onClose={closeModal}
          icon="🧭"
          titleKey="gps.guideModal.title"
          messageKey="gps.guideModal.message"
          hintIcon="👆"
          hintKey="gps.guideModal.hint"
        />
        
        {/* ===== TOOLTIP TOUR - Mode Navigation ===== */}
        <TooltipTour
          isActive={isTooltipActive}
          currentTooltip={currentTooltip}
          currentStep={tooltipStep}
          totalSteps={tooltipTotal}
          onNext={nextTooltip}
          onPrev={prevTooltip}
          onSkip={skipTooltips}
        />
        
        {/* POPUP TRANSACTIONS DU JOUR - dans Navigation */}
        {todayTransactionsPopup && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            animation: 'fadeIn 0.3s ease'
          }}
          onClick={(e) => e.target === e.currentTarget && setTodayTransactionsPopup(null)}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: '24px',
                padding: '0',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'hidden',
                boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
                animation: 'bounceIn 0.3s ease'
              }}>
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '25px 30px',
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '2em' }}>📅</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.3em', fontWeight: 'bold' }}>
                      {t('accounts.transactions.title')}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85em', opacity: 0.9 }}>
                      {todayTransactionsPopup.dateLabel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contenu - Liste des transactions */}
              <div style={{ padding: '20px 25px', maxHeight: '45vh', overflowY: 'auto' }}>
                <p style={{ margin: '0 0 15px', color: '#7f8c8d', fontSize: '0.9em' }}>
                  {t('gps.transactions.scheduledCount', { count: todayTransactionsPopup.transactions.length })}
                </p>
                
                {/* Liste des transactions groupées par compte */}
                {(() => {
                  const groupedByAccount = {};
                  todayTransactionsPopup.transactions.forEach(tr => {
                    if (!groupedByAccount[tr.compte]) {
                      groupedByAccount[tr.compte] = { entrees: [], sorties: [], type: tr.compteType };
                    }
                    if (tr.isEntree) {
                      groupedByAccount[tr.compte].entrees.push(tr);
                    } else {
                      groupedByAccount[tr.compte].sorties.push(tr);
                    }
                  });
                  
                  return Object.entries(groupedByAccount).map(([compte, data]) => (
                    <div key={compte} style={{ marginBottom: '15px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        paddingBottom: '5px',
                        borderBottom: '1px solid #eee'
                      }}>
                        <span style={{ fontSize: '1.1em' }}>
                          {data.type === 'credit' ? '💳' : data.type === 'epargne' ? '🌱' : '🏦'}
                        </span>
                        <span style={{ fontWeight: '600', color: '#2c3e50' }}>{compte}</span>
                      </div>
                      
                      {data.entrees.map((tr, idx) => {
                        const isConfirmed = isTransactionConfirmed(tr.id);
                        return (
                          <div key={`e-${idx}`} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            marginBottom: '4px',
                            borderRadius: '8px',
                            background: isConfirmed ? 'rgba(39, 174, 96, 0.3)' : 'rgba(39, 174, 96, 0.1)',
                            border: isConfirmed ? '2px solid #27ae60' : '1px solid rgba(39, 174, 96, 0.2)',
                            opacity: isConfirmed ? 0.7 : 1,
                            transition: 'all 0.3s ease'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                              <button
                                onClick={() => !isConfirmed && confirmTransaction(tr.id)}
                                disabled={isConfirmed}
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  border: isConfirmed ? 'none' : '2px solid #27ae60',
                                  background: isConfirmed ? '#27ae60' : 'white',
                                  color: isConfirmed ? 'white' : '#27ae60',
                                  cursor: isConfirmed ? 'default' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '13px',
                                  fontWeight: 'bold',
                                  transition: 'all 0.2s',
                                  flexShrink: 0
                                }}
                              >
                                {isConfirmed ? '✓' : ''}
                              </button>
                              <span style={{ 
                                fontSize: '0.9em', 
                                color: '#2c3e50',
                                textDecoration: isConfirmed ? 'line-through' : 'none'
                              }}>
                                {tr.description}
                              </span>
                            </div>
                            <span style={{ fontWeight: 'bold', color: '#3498db' }}>
                              +{formatMontant(tr.montant)}
                            </span>
                          </div>
                        );
                      })}
                      
                      {data.sorties.map((tr, idx) => {
                        const isConfirmed = isTransactionConfirmed(tr.id);
                        return (
                          <div key={`s-${idx}`} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            marginBottom: '4px',
                            borderRadius: '8px',
                            background: isConfirmed ? 'rgba(231, 76, 60, 0.3)' : 'rgba(231, 76, 60, 0.1)',
                            border: isConfirmed ? '2px solid #e74c3c' : '1px solid rgba(231, 76, 60, 0.2)',
                            opacity: isConfirmed ? 0.7 : 1,
                            transition: 'all 0.3s ease'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                              <button
                                onClick={() => !isConfirmed && confirmTransaction(tr.id)}
                                disabled={isConfirmed}
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  border: isConfirmed ? 'none' : '2px solid #e74c3c',
                                  background: isConfirmed ? '#e74c3c' : 'white',
                                  color: isConfirmed ? 'white' : '#e74c3c',
                                  cursor: isConfirmed ? 'default' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '13px',
                                  fontWeight: 'bold',
                                  transition: 'all 0.2s',
                                  flexShrink: 0
                                }}
                              >
                                {isConfirmed ? '✓' : ''}
                              </button>
                              <span style={{ 
                                fontSize: '0.9em', 
                                color: '#2c3e50',
                                textDecoration: isConfirmed ? 'line-through' : 'none'
                              }}>
                                {tr.description}
                              </span>
                            </div>
                            <span style={{ fontWeight: 'bold', color: '#e74c3c' }}>
                              -{formatMontant(tr.montant)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>

              {/* Footer - Boutons */}
              <div style={{
                padding: '20px 25px',
                borderTop: '1px solid #eee',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {/* 🆕 Compteur de transactions confirmées */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  background: confirmedTransactions.length === todayTransactionsPopup?.transactions?.length 
                    ? 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)' 
                    : '#f8f9fa',
                  borderRadius: '10px',
                  marginBottom: '5px'
                }}>
                  <span style={{ fontSize: '1.2em' }}>
                    {confirmedTransactions.length === todayTransactionsPopup?.transactions?.length ? '🎉' : '📋'}
                  </span>
                  <span style={{ 
                    fontWeight: '600', 
                    color: confirmedTransactions.length === todayTransactionsPopup?.transactions?.length ? '#155724' : '#495057'
                  }}>
                    {confirmedTransactions.length === todayTransactionsPopup?.transactions?.length 
                      ? t('gps.transactions.allConfirmed', 'Toutes les transactions confirmées!')
                      : `${confirmedTransactions.length} / ${todayTransactionsPopup?.transactions?.length || 0} ${t('gps.transactions.confirmed', 'confirmées')}`
                    }
                  </span>
                </div>
                
                <button
                  onClick={() => {
                    // 🆕 Ne plus marquer tout comme confirmé - juste fermer et naviguer
                    setTodayTransactionsPopup(null);
                    setIsFullScreen(false);
                    navigate('/comptes');
                  }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.95em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(52, 152, 219, 0.4)'
                  }}
                >
                  💼 {t('gps.transactions.goToAccounts', 'Aller à mes comptes')}
                </button>
                
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      const remindLaterKey = `gps_transactions_remind_later_${todayStr}`;
                      sessionStorage.setItem(remindLaterKey, 'true');
                      setRemindLaterClicked(true); // Permet aux autres badges d'apparaître
                      setTodayTransactionsPopup(null);
                    }}
                    style={{
                      flex: 1,
                      maxWidth: '200px',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '2px solid #3498db',
                      background: 'white',
                      color: '#3498db',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '0.85em'
                    }}
                  >
                    🔔 {t('gps.transactions.remindLater', 'Me le rappeler')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* OPTIMIZATION MODAL - dans Navigation */}
        {showOptimizationPopup && (
          <OptimizationModal
            isOpen={showOptimizationPopup}
            onClose={() => setShowOptimizationPopup(false)}
            optimizedBudgets={optimizedBudgets}
            optimizedCount={optimizedCount}
            formatMontant={formatMontant}
            userData={userData}
            saveUserData={saveUserData}
            baseBudgetEntrees={baseBudgetEntrees}
            baseBudgetSorties={baseBudgetSorties}
            profileEndDate={(() => { const d = new Date(); d.setFullYear(d.getFullYear() + 54); return d; })()}
            allDayData={allDayData}
            onOptimizationApplied={() => {
              // Déclencher l'effet de brillance sur la route
              setRouteGlowEffect(true);
              setTimeout(() => setRouteGlowEffect(false), 2500);
            }}
          />
        )}
        
        {/* MODAL DEMANDE PL4TO 📊 - dans Navigation */}
        {showPL4TORequestModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            animation: 'fadeIn 0.3s ease'
          }}
          onClick={(e) => e.target === e.currentTarget && setShowPL4TORequestModal(false)}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: '24px',
                padding: '0',
                maxWidth: '450px',
                width: '90%',
                overflow: 'hidden',
                boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
                animation: 'bounceIn 0.3s ease'
              }}>
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                padding: '30px',
                color: 'white',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '3em', display: 'block', marginBottom: '10px' }}>🚀</span>
                <h3 style={{ margin: 0, fontSize: '1.4em', fontWeight: 'bold' }}>
                  {t('gps.pl4toRequest.title', 'Améliorer votre parcours')}
                </h3>
              </div>

              {/* Contenu */}
              <div style={{ padding: '25px 30px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 15px', color: '#2c3e50', fontSize: '1.1em', fontWeight: '500' }}>
                  {t('gps.pl4toRequest.question', 'Voulez-vous que PL4TO améliore votre parcours financier?')}
                </p>
                <p style={{ margin: '0', color: '#7f8c8d', fontSize: '0.9em', lineHeight: '1.5' }}>
                  {t('gps.pl4toRequest.hint', 'Notre expert analysera votre trajectoire et vous proposera des optimisations personnalisées.')}
                </p>
              </div>

              {/* Footer - Boutons */}
              <div style={{
                padding: '20px 30px',
                borderTop: '1px solid #eee',
                display: 'flex',
                gap: '12px'
              }}>
                <button
                  onClick={() => setShowPL4TORequestModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: '2px solid #bdc3c7',
                    background: 'white',
                    color: '#7f8c8d',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.95em'
                  }}
                >
                  {t('common.no', 'Non')}
                </button>
                <button
                  onClick={() => {
                    setShowPL4TORequestModal(false);
                    setIsFullScreen(false);
                    // Naviguer vers gestion-comptes avec un paramètre pour ouvrir en fullscreen
                    navigate('/gestion-comptes?fullscreen=true');
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.95em',
                    boxShadow: '0 4px 15px rgba(52, 152, 219, 0.4)'
                  }}
                >
                  {t('common.yes', 'Oui')}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* ✅ BARRE "ON CONTINUE" - Guide GPS Navigation */}
        {showContinueBar && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '15px 25px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            zIndex: 10001,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
          }}>
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
          </div>
        )}

        {/* 💡 Bouton d'aide - En mode plein écran et si onboarding terminé */}
        {isGuideComplete && isFullScreen && (
          <button
            onClick={() => {
              isManualTourRef.current = true; // Marquer comme tour manuel
              resetTooltips();
              setTimeout(() => startTooltipTour(), 100);
            }}
            style={{
              position: 'fixed',
              bottom: isMobile ? '215px' : '24px',
              right: isMobile ? '8px' : '24px',
              background: 'transparent',
              border: 'none',
              fontSize: isMobile ? '20px' : '32px',
              cursor: 'pointer',
              zIndex: 1000,
              padding: isMobile ? '4px' : '8px',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            title="Aide - Voir le guide de la page"
            aria-label="Aide - Voir le guide de la page"
          >
            💡
          </button>
        )}
      </div>
    );
  }
  // 🔒 Sécurité: Vérifier qu'on est bien sur la page GPS pour le fullscreen
  const isOnGpsPage = location.pathname.startsWith('/gps');
  const shouldApplyFullScreen = isFullScreen && isOnGpsPage;
  
  // 📱 Afficher overlay "Tournez votre écran" sur mobile en portrait pour la page Itinéraire
  const showRotateOverlay = isMobile && isPortrait && !navigationMode;
  
  // 📱 Mode optimisé pour la page Itinéraire sur MOBILE uniquement
  // S'applique quand: mobile ET page Itinéraire (pas Navigation)
  const isMobileLandscape = isMobile && !navigationMode;
  
  return (
    <div 
      style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: shouldApplyFullScreen ? '100vh' : '100%', 
      gap: '0',
      position: 'relative',
      background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
      ...(shouldApplyFullScreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'linear-gradient(180deg, #040449 0%, #100261 100%)'
      } : {})
    }}>
      
      {/* 📱 OVERLAY: Tournez votre écran en mode paysage */}
      {showRotateOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
          textAlign: 'center'
        }}>
          {/* Icône de rotation animée */}
          <div style={{
            fontSize: '80px',
            marginBottom: '30px',
            animation: 'rotatePhone 2s ease-in-out infinite'
          }}>
            📱
          </div>
          
          {/* Flèche de rotation */}
          <div style={{
            fontSize: '40px',
            marginBottom: '30px',
            color: '#ffd700',
            animation: 'rotateArrow 1.5s ease-in-out infinite'
          }}>
            ↻
          </div>
          
          {/* Message principal */}
          <h2 style={{
            color: '#ffd700',
            fontSize: '1.5em',
            fontWeight: 'bold',
            marginBottom: '15px',
            textShadow: '0 2px 10px rgba(255, 215, 0, 0.3)'
          }}>
            {t('gps.rotateScreen.title', 'Tournez votre écran')}
          </h2>
          
          {/* Message secondaire */}
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '1em',
            maxWidth: '280px',
            lineHeight: '1.5'
          }}>
            {t('gps.rotateScreen.message', 'Pour une meilleure expérience de la Trajectoire Financière, veuillez tourner votre appareil en mode paysage.')}
          </p>
          
          {/* Bouton retour */}
          <button
            onClick={() => navigate('/gps')}
            style={{
              marginTop: '40px',
              padding: '12px 30px',
              background: 'linear-gradient(135deg, #3498db, #2980b9)',
              border: 'none',
              borderRadius: '25px',
              color: 'white',
              fontSize: '1em',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(52, 152, 219, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← {t('gps.rotateScreen.backButton', 'Retour à Navigation')}
          </button>
          
          {/* Animation CSS */}
          <style>{`
            @keyframes rotatePhone {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(-15deg); }
              75% { transform: rotate(90deg); }
            }
            @keyframes rotateArrow {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.5; transform: scale(1.2); }
            }
          `}</style>
        </div>
      )}
      
      {/* OVERLAY NAVIGATION CALENDRIER */}
      
      {/* 📱 POPUP: Pivotez votre écran avant de quitter Itinéraire */}
      {showRotateToPortraitPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
          textAlign: 'center'
        }}>
          {/* Icône de rotation */}
          <div style={{
            fontSize: '4em',
            marginBottom: '20px',
            animation: 'rotateToPortrait 1.5s ease-in-out infinite'
          }}>
            📱
          </div>
          
          {/* Flèche de rotation inverse */}
          <div style={{
            fontSize: '2em',
            marginBottom: '20px',
            color: '#667eea'
          }}>
            ↺
          </div>
          
          {/* Titre */}
          <h2 style={{
            color: 'white',
            fontSize: '1.3em',
            fontWeight: 'bold',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            {t('gps.rotateToPortrait.title', 'Pivotez votre écran')}
          </h2>
          
          {/* Animation CSS */}
          <style>{`
            @keyframes rotateToPortrait {
              0%, 100% { transform: rotate(90deg); }
              50% { transform: rotate(0deg); }
            }
          `}</style>
        </div>
      )}

      {isNavigatingToGoal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(4, 4, 73, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px'
          }}>
            {/* 3 cercles qui rebondissent */}
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              animation: 'goal-bounce 0.6s ease-in-out infinite',
              animationDelay: '0s',
              boxShadow: '0 0 20px rgba(102, 126, 234, 0.6)'
            }} />
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)',
              animation: 'goal-bounce 0.6s ease-in-out infinite',
              animationDelay: '0.15s',
              boxShadow: '0 0 20px rgba(39, 174, 96, 0.6)'
            }} />
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00bcd4 0%, #0097a7 100%)',
              animation: 'goal-bounce 0.6s ease-in-out infinite',
              animationDelay: '0.3s',
              boxShadow: '0 0 20px rgba(0, 188, 212, 0.6)'
            }} />
          </div>
          <p style={{
            color: 'white',
            fontSize: '1.1em',
            fontWeight: '500',
            opacity: 0.9
          }}>
            {t('gps.recalculation.navigatingToEvent')}
          </p>
        </div>
      )}

      {/* 🆕 OVERLAY ANIMATION CHANGEMENT DE MODE GPS */}
      {isRecalculating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: whatIfMode === 'foundations'
            ? 'rgba(30, 15, 5, 0.95)'
            : whatIfMode === 'smartRoute'
              ? 'rgba(15, 5, 32, 0.95)'
              : 'rgba(4, 4, 73, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {/* Cercle GPS animé */}
          <div style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            marginBottom: '30px'
          }}>
            {/* Cercle externe qui tourne */}
            <div style={{
              position: 'absolute',
              width: '120px',
              height: '120px',
              border: `4px solid ${whatIfMode === 'foundations' ? 'rgba(46, 204, 113, 0.3)' : whatIfMode === 'smartRoute' ? 'rgba(0, 188, 212, 0.3)' : 'rgba(4, 4, 73, 0.3)'}`,
              borderTop: `4px solid ${whatIfMode === 'foundations' ? '#2ecc71' : whatIfMode === 'smartRoute' ? '#00bcd4' : '#100261'}`,
              borderRadius: '50%',
              animation: 'gps-spin 0.8s linear infinite',
              boxSizing: 'border-box'
            }} />
            {/* Cercle interne qui tourne en sens inverse */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              width: '80px',
              height: '80px',
              border: `3px solid ${whatIfMode === 'foundations' ? 'rgba(39, 174, 96, 0.3)' : whatIfMode === 'smartRoute' ? 'rgba(0, 151, 167, 0.3)' : 'rgba(16, 2, 97, 0.3)'}`,
              borderBottom: `3px solid ${whatIfMode === 'foundations' ? '#27ae60' : whatIfMode === 'smartRoute' ? '#0097a7' : '#040449'}`,
              borderRadius: '50%',
              animation: 'gps-spin 1.2s linear infinite reverse',
              boxSizing: 'border-box'
            }} />
            {/* Icône centrale */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '2.5em',
              animation: 'gps-pulse 0.8s ease-in-out infinite'
            }}>
              {whatIfMode === 'foundations' ? '⚓' : whatIfMode === 'smartRoute' ? '⭐' : '🧭'}
            </div>
          </div>
          
          {/* Texte de recalcul */}
          <p style={{
            color: 'white',
            fontSize: '1.2em',
            fontWeight: 'bold',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            animation: 'pulse-text 1s ease-in-out infinite'
          }}>
            {recalculatingStep === 0 && (whatIfMode === 'foundations' 
              ? `🧭 ${t('gps.recalculation.loadingFoundations')}`
              : whatIfMode === 'smartRoute'
                ? `🧭 ${t('gps.recalculation.calculatingSmartRoute')}`
                : `🧭 ${t('gps.recalculation.recalculatingPilotAuto')}`)}
            {recalculatingStep === 1 && `📊 ${t('gps.recalculation.analyzingBudgets')}`}
            {recalculatingStep === 2 && `✅ ${t('gps.recalculation.trajectoryReady')}`}
          </p>
          
          {/* Barre de progression */}
          <div style={{
            width: '200px',
            height: '4px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '2px',
            marginTop: '20px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: recalculatingStep === 0 ? '33%' : recalculatingStep === 1 ? '66%' : '100%',
              height: '100%',
              background: whatIfMode === 'foundations'
                ? 'linear-gradient(90deg, #2ecc71, #27ae60)'
                : whatIfMode === 'smartRoute'
                  ? 'linear-gradient(90deg, #00bcd4, #0097a7)'
                  : 'linear-gradient(90deg, #040449, #100261)',
              borderRadius: '2px',
              transition: 'width 0.4s ease-out'
            }} />
          </div>
        </div>
      )}

      {/* ZONE DE NOTIFICATIONS - Barre "On continue" ou espace réservé */}
      {!isFullScreen && (
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
          transition: 'all 0.3s ease',
          zIndex: 200
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
      )}
      
      {/* OVERLAY PLEIN ÉCRAN - Bloque tous les clics quand pas en plein écran */}
      {!isFullScreen && !isTrajectoireAvancee && (
        <div
          onClick={() => {
            // ✅ Bloquer le passage en plein écran pendant le guide
            if (showGuide || showContinueBar) return;
            setIsFullScreen(true);
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            cursor: (showGuide || showContinueBar) ? 'default' : 'pointer',
            background: 'transparent'
          }}
        />
      )}
      
      {/* Loader GPS retiré - animation déplacée dans la section Navigation */}
      <style>{`
        /* Scrollbar GPS Néon - Style lumineux orange */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #ffa500, #ff6b00);
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(255, 165, 0, 0.6), 0 0 20px rgba(255, 165, 0, 0.4);
          border: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #ffb732, #ff8533);
          box-shadow: 0 0 15px rgba(255, 165, 0, 0.8), 0 0 30px rgba(255, 165, 0, 0.5);
        }
        
        ::-webkit-scrollbar-corner {
          background: transparent;
        }
        
        /* Firefox scrollbar */
        * {
          scrollbar-width: thin;
          scrollbar-color: #ffa500 rgba(255, 255, 255, 0.05);
        }
        
        @keyframes view-zoom-in {
          0% { 
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% { 
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes view-text-fade {
          0% { 
            opacity: 0;
            transform: translateY(5px);
          }
          100% { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse-today {
          0%, 100% { box-shadow: 0 6px 20px rgba(46, 204, 113, 0.4); }
          50% { box-shadow: 0 6px 30px rgba(46, 204, 113, 0.7); }
        }
        
        @keyframes pulse-goal {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(0, 188, 212, 0.3);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 40px rgba(0, 188, 212, 0.8);
            transform: scale(1.02);
          }
        }
        
        @keyframes alert-blink {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(231, 76, 60, 0.5);
          }
          50% { 
            transform: scale(1.2);
            box-shadow: 0 4px 15px rgba(46, 204, 113, 0.8);
          }
        }
        
        @keyframes gps-circle-pulse {
          0%, 100% { 
            transform: scale(1.2);
            box-shadow: 0 0 30px currentColor;
          }
          50% { 
            transform: scale(1.4);
            box-shadow: 0 0 50px currentColor;
          }
        }
        
        @keyframes goal-bounce {
          0%, 100% { 
            transform: translateY(0);
          }
          50% { 
            transform: translateY(-12px);
          }
        }
        
        @keyframes alert-header-pulse {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4);
          }
          50% { 
            box-shadow: 0 0 0 8px rgba(46, 204, 113, 0);
          }
        }
        
        .alert-badge-blink {
          animation: alert-blink 1s ease-in-out infinite;
        }
        
        .account-header-alert {
          animation: alert-header-pulse 2s ease-in-out infinite;
        }
        
        .bubble-limit-exceeded {
          opacity: 0.4 !important;
          filter: blur(1px) grayscale(30%);
          pointer-events: none !important;
          cursor: not-allowed !important;
          position: relative;
        }
        
        .bubble-limit-exceeded::after {
          content: '🚧';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 2em;
          opacity: 0.6;
        }
        
        .limit-exceeded-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: linear-gradient(135deg, #2ecc71, #27ae60);
          color: white;
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 0.6em;
          font-weight: bold;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(46, 204, 113, 0.4);
        }
        
        .bubble-limit-warning {
          background: linear-gradient(135deg, rgba(46, 204, 113, 0.15), rgba(39, 174, 96, 0.1)) !important;
          border: 3px solid #2ecc71 !important;
          box-shadow: 0 0 15px rgba(46, 204, 113, 0.3), 0 4px 12px rgba(0,0,0,0.08) !important;
        }
        
        .bubble-goal-achieved {
          background: linear-gradient(135deg, rgba(46, 204, 113, 0.2), rgba(39, 174, 96, 0.1)) !important;
          border: 3px solid #3498db !important;
          box-shadow: 0 0 20px rgba(46, 204, 113, 0.4), 0 4px 15px rgba(0,0,0,0.1) !important;
          position: relative;
          overflow: visible !important;
        }
        
        .bubble-goal-achieved::before {
          content: '⭐';
          position: absolute;
          top: -12px;
          right: -12px;
          font-size: 1.8em;
          z-index: 50;
          filter: drop-shadow(0 0 8px rgba(241, 196, 15, 0.8));
          animation: star-float 2s ease-in-out infinite;
        }
        
        @keyframes star-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-3px) rotate(10deg); }
        }
        
        .goal-achieved-badge {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #3498db, #5dade2);
          color: white;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 0.65em;
          font-weight: bold;
          white-space: nowrap;
          z-index: 45;
          box-shadow: 0 2px 10px rgba(39, 174, 96, 0.4);
        }
        
        .bubble-after-goal {
          opacity: 1 !important;
          pointer-events: auto !important;
          cursor: pointer !important;
          position: relative;
        }
        
        .bubble-after-goal::after {
          content: '';
        }
        
        @keyframes goal-star-burst {
          0% { 
            box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.9), 0 0 0 0 rgba(241, 196, 15, 0.7);
            border-color: #3498db;
          }
          25% { 
            box-shadow: 0 0 30px 15px rgba(46, 204, 113, 0.7), 0 0 60px 30px rgba(241, 196, 15, 0.5);
          }
          50% { 
            box-shadow: 0 0 50px 25px rgba(46, 204, 113, 0.5), 0 0 100px 50px rgba(241, 196, 15, 0.3);
            border-color: #f1c40f;
          }
          75% { 
            box-shadow: 0 0 30px 15px rgba(46, 204, 113, 0.7), 0 0 60px 30px rgba(241, 196, 15, 0.5);
          }
          100% { 
            box-shadow: 0 0 20px 10px rgba(46, 204, 113, 0.6), 0 0 40px 20px rgba(241, 196, 15, 0.4);
            border-color: #3498db;
          }
        }
        
        @keyframes star-appear {
          0% { 
            transform: scale(0) rotate(0deg); 
            opacity: 0; 
          }
          40% { 
            transform: scale(2) rotate(180deg); 
            opacity: 1; 
          }
          70% { 
            transform: scale(1.5) rotate(300deg); 
            opacity: 1; 
          }
          100% { 
            transform: scale(1.3) rotate(360deg); 
            opacity: 1; 
          }
        }
        
        @keyframes star-pulse {
          0%, 100% { transform: scale(1.3); filter: drop-shadow(0 0 15px rgba(241, 196, 15, 1)); }
          50% { transform: scale(1.8); filter: drop-shadow(0 0 25px rgba(241, 196, 15, 1)); }
        }
        
        @keyframes label-slide-in {
          0% { 
            opacity: 0; 
            transform: translateX(-50%) translateY(-20px); 
          }
          100% { 
            opacity: 1; 
            transform: translateX(-50%) translateY(0); 
          }
        }
        
        .goal-glow {
          animation: goal-star-burst 0.8s ease-in-out infinite !important;
          position: relative;
          z-index: 100;
          border: 4px solid #5dade2 !important;
          border-radius: 25px;
          background: rgba(46, 204, 113, 0.1) !important;
        }
        
        .goal-glow-red {
          animation: goal-star-burst-red 0.8s ease-in-out infinite !important;
          position: relative;
          z-index: 100;
          border: 4px solid #e74c3c !important;
          border-radius: 25px;
          background: rgba(231, 76, 60, 0.1) !important;
        }
        
        .goal-glow-blue {
          animation: goal-star-burst-blue 0.8s ease-in-out infinite !important;
          position: relative;
          z-index: 100;
          border: 4px solid #3498db !important;
          border-radius: 25px;
          background: rgba(52, 152, 219, 0.1) !important;
        }
        
        .goal-glow-orange {
          animation: goal-star-burst-orange 0.8s ease-in-out infinite !important;
          position: relative;
          z-index: 100;
          border: 4px solid #f39c12 !important;
          border-radius: 25px;
          background: rgba(243, 156, 18, 0.1) !important;
        }
        
        @keyframes goal-star-burst-orange {
          0% { 
            box-shadow: 0 0 0 0 rgba(243, 156, 18, 0.9), 0 0 0 0 rgba(230, 126, 34, 0.7);
            border-color: #f39c12;
          }
          25% { 
            box-shadow: 0 0 30px 15px rgba(243, 156, 18, 0.7), 0 0 60px 30px rgba(230, 126, 34, 0.5);
          }
          50% { 
            box-shadow: 0 0 50px 25px rgba(243, 156, 18, 0.5), 0 0 100px 50px rgba(230, 126, 34, 0.3);
            border-color: #e67e22;
          }
          75% { 
            box-shadow: 0 0 30px 15px rgba(243, 156, 18, 0.7), 0 0 60px 30px rgba(230, 126, 34, 0.5);
          }
          100% { 
            box-shadow: 0 0 20px 10px rgba(243, 156, 18, 0.6), 0 0 40px 20px rgba(230, 126, 34, 0.4);
            border-color: #f39c12;
          }
        }
        
        @keyframes goal-star-burst-red {
          0% { 
            box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.9), 0 0 0 0 rgba(192, 57, 43, 0.7);
            border-color: #e74c3c;
          }
          25% { 
            box-shadow: 0 0 30px 15px rgba(231, 76, 60, 0.7), 0 0 60px 30px rgba(192, 57, 43, 0.5);
          }
          50% { 
            box-shadow: 0 0 50px 25px rgba(231, 76, 60, 0.5), 0 0 100px 50px rgba(192, 57, 43, 0.3);
            border-color: #c0392b;
          }
          75% { 
            box-shadow: 0 0 30px 15px rgba(231, 76, 60, 0.7), 0 0 60px 30px rgba(192, 57, 43, 0.5);
          }
          100% { 
            box-shadow: 0 0 20px 10px rgba(231, 76, 60, 0.6), 0 0 40px 20px rgba(192, 57, 43, 0.4);
            border-color: #e74c3c;
          }
        }
        
        @keyframes goal-star-burst-blue {
          0% { 
            box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.9), 0 0 0 0 rgba(41, 128, 185, 0.7);
            border-color: #3498db;
          }
          25% { 
            box-shadow: 0 0 30px 15px rgba(52, 152, 219, 0.7), 0 0 60px 30px rgba(41, 128, 185, 0.5);
          }
          50% { 
            box-shadow: 0 0 50px 25px rgba(52, 152, 219, 0.5), 0 0 100px 50px rgba(41, 128, 185, 0.3);
            border-color: #2980b9;
          }
          75% { 
            box-shadow: 0 0 30px 15px rgba(52, 152, 219, 0.7), 0 0 60px 30px rgba(41, 128, 185, 0.5);
          }
          100% { 
            box-shadow: 0 0 20px 10px rgba(52, 152, 219, 0.6), 0 0 40px 20px rgba(41, 128, 185, 0.4);
            border-color: #3498db;
          }
        }
        
        .goal-star::before {
          content: '⭐';
          position: absolute;
          top: -20px;
          right: -20px;
          font-size: 2.5em;
          animation: star-appear 0.8s ease-out forwards, star-pulse 0.6s ease-in-out 0.8s infinite;
          z-index: 200;
          filter: drop-shadow(0 0 15px rgba(241, 196, 15, 1));
        }
        
        .goal-star::after {
          content: '${i18n.language === "fr" ? "🎯 Objectif atteint ici!" : "🎯 Goal reached here!"}';
          position: absolute;
          top: -55px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #3498db, #5dade2);
          color: white;
          padding: 10px 20px;
          border-radius: 25px;
          font-size: 1em;
          font-weight: bold;
          white-space: nowrap;
          z-index: 201;
          box-shadow: 0 6px 20px rgba(39, 174, 96, 0.5);
          animation: label-slide-in 0.5s ease-out 0.3s forwards;
          opacity: 0;
        }
        
        .goal-marker {
          position: relative;
        }
        
        .goal-marker:hover {
          z-index: 100 !important;
        }
        
        @keyframes appear-in {
          from { 
            opacity: 0; 
            transform: translateY(15px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes slide-in-left {
          0% { opacity: 0; transform: translateX(-20px) scale(0.8); }
          60% { transform: translateX(5px) scale(1.05); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        
        @keyframes slide-in-right {
          0% { opacity: 0; transform: translateX(20px) scale(0.8); }
          60% { transform: translateX(-5px) scale(1.05); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        
        @keyframes arrow-bounce-in {
          0% { 
            transform: translateY(-25px);
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          70% { 
            transform: translateY(10px);
            opacity: 1;
          }
          100% { 
            transform: translateY(20px);
            opacity: 0;
          }
        }
        
        @keyframes arrow-bounce-out {
          0% { 
            transform: translateY(0);
            opacity: 1;
          }
          30% {
            transform: translateY(5px);
            opacity: 1;
          }
          100% { 
            transform: translateY(-25px);
            opacity: 0;
          }
        }
        
        .entry-arrow {
          position: absolute;
          top: 5px;
          left: 10px;
          font-size: 18px;
          animation: arrow-bounce-in 0.8s ease-out forwards;
          animation-iteration-count: 2;
          filter: drop-shadow(0 2px 3px rgba(52, 152, 219, 0.4));
          z-index: 5;
        }
        
        .exit-arrow {
          position: absolute;
          top: 5px;
          right: 10px;
          font-size: 18px;
          animation: arrow-bounce-out 0.8s ease-out forwards;
          animation-iteration-count: 2;
          filter: drop-shadow(0 2px 3px rgba(231, 76, 60, 0.4));
          z-index: 5;
        }
        
        @keyframes money-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes value-change {
          0% { 
            color: #667eea;
            transform: scale(1.1);
          }
          100% { 
            transform: scale(1);
          }
        }
        
        @keyframes money-enter {
          0% { 
            transform: translateX(-50%) translateY(-35px) scale(1.3);
            opacity: 0;
          }
          30% {
            opacity: 1;
            transform: translateX(-50%) translateY(-20px) scale(1.1);
          }
          70% {
            opacity: 1;
            transform: translateX(-50%) translateY(-5px) scale(1);
          }
          100% { 
            transform: translateX(-50%) translateY(0px) scale(0.8);
            opacity: 0;
          }
        }
        
        @keyframes money-exit {
          0% { 
            transform: translateX(50%) translateY(0px) scale(0.8);
            opacity: 0;
          }
          30% {
            opacity: 1;
            transform: translateX(50%) translateY(-5px) scale(1);
          }
          70% {
            opacity: 1;
            transform: translateX(50%) translateY(-20px) scale(1.1);
          }
          100% { 
            transform: translateX(50%) translateY(-35px) scale(1.3);
            opacity: 0;
          }
        }
        
        @keyframes transfer-glow {
          0%, 100% { 
            box-shadow: 0 0 5px rgba(243, 156, 18, 0.3);
          }
          50% { 
            box-shadow: 0 0 20px rgba(243, 156, 18, 0.8), 0 0 30px rgba(243, 156, 18, 0.4);
          }
        }
        
        @keyframes transfer-out {
          0% { 
            transform: translateX(0) scale(1);
            opacity: 1;
          }
          50% { 
            transform: translateX(15px) scale(1.2);
            opacity: 1;
          }
          100% { 
            transform: translateX(30px) scale(0.8);
            opacity: 0;
          }
        }
        
        @keyframes transfer-in {
          0% { 
            transform: translateX(-30px) scale(0.8);
            opacity: 0;
          }
          50% { 
            transform: translateX(-15px) scale(1.2);
            opacity: 1;
          }
          100% { 
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes particle-fly-out {
          0% { 
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
          100% { 
            transform: translateX(40px) translateY(-10px);
            opacity: 0;
          }
        }
        
        @keyframes particle-fly-in {
          0% { 
            transform: translateX(-40px) translateY(-10px);
            opacity: 0;
          }
          100% { 
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
        }
        
        .roller-row {
          transition: background 0.15s ease-out, box-shadow 0.15s ease-out;
        }
        
        .roller-row.visible {
          animation: appear-in 0.3s ease-out forwards;
        }
        
        .roller-row:hover {
          background: rgba(102, 126, 234, 0.08) !important;
          box-shadow: 0 4px 15px rgba(0,0,0,0.06);
        }
        
        .activity-badge {
          animation: money-pulse 0.5s ease-out;
        }
        
        .activity-badge.entry {
          animation: slide-in-left 0.5s ease-out;
        }
        
        .activity-badge.exit {
          animation: slide-in-right 0.5s ease-out;
        }
        
        .activity-badge.entry::after,
        .activity-badge.exit::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: shine 0.8s ease-out forwards;
        }
        
        @keyframes shine {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        
        .solde-animating {
          animation: value-change 0.4s ease-out;
        }
        
        .bubble-with-activity {
          transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
          cursor: pointer;
        }
        
        .bubble-with-activity:hover {
          transform: scale(1.08) translateY(-3px);
          box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4) !important;
          z-index: 10;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: overlay-appear 0.2s ease-out;
        }
        
        @keyframes overlay-appear {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .bubble-modal {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 0;
          min-width: 320px;
          max-width: 450px;
          max-height: 85vh;
          overflow: hidden;
          animation: modal-appear 0.25s ease-out;
          display: flex;
          flex-direction: column;
        }
        
        @media (max-width: 768px) {
          .bubble-modal {
            min-width: 90vw;
            max-width: 95vw;
            max-height: 80vh;
          }
        }
        
        @keyframes modal-appear {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        .transfer-active {
          animation: transfer-glow 1s ease-in-out 2;
        }
        
        .transfer-indicator {
          position: absolute;
          top: 5px;
          font-size: 18px;
          z-index: 10;
        }
        
        .transfer-indicator.source {
          right: 5px;
          animation: transfer-out 0.8s ease-out infinite;
        }
        
        .transfer-indicator.destination {
          left: 5px;
          animation: transfer-in 0.8s ease-out infinite;
        }
        
        .transfer-particles {
          position: absolute;
          top: 50%;
          pointer-events: none;
        }
        
        .transfer-particles.source {
          right: 10px;
        }
        
        .transfer-particles.destination {
          left: 10px;
        }
        
        .particle {
          position: absolute;
          font-size: 12px;
        }
        
        .particle.out {
          animation: particle-fly-out 0.6s ease-out forwards;
        }
        
        .particle.in {
          animation: particle-fly-in 0.6s ease-out forwards;
        }
        
        .scroll-depth-top {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          height: 30px;
          background: linear-gradient(180deg, 
            rgba(245,247,250,1) 0%, 
            rgba(245,247,250,0) 100%);
          pointer-events: none;
          z-index: 20;
          margin-bottom: -30px;
        }
        
        .scroll-depth-bottom {
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          height: 30px;
          background: linear-gradient(0deg, 
            rgba(245,247,250,1) 0%, 
            rgba(245,247,250,0) 100%);
          pointer-events: none;
          z-index: 20;
          margin-top: -30px;
        }
        
        .date-cell {
          position: relative;
        }
        
        .date-cell .edit-budget-btn {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.9);
          color: #667eea;
          font-size: 12px;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 10;
        }
        
        .date-cell:hover .edit-budget-btn {
          opacity: 1;
        }
        
        .date-cell .edit-budget-btn:hover {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          transform: scale(1.1);
        }
        
        .budget-edit-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: overlay-appear 0.2s ease-out;
        }
        
        .budget-edit-modal {
          background: white;
          border-radius: 24px;
          box-shadow: 0 25px 80px rgba(0,0,0,0.3);
          padding: 0;
          width: 90%;
          max-width: 500px;
          max-height: 85vh;
          overflow: hidden;
          animation: modal-appear 0.3s ease-out;
        }
        
        /* Animations pour le recalcul GPS */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes pulse-glow {
          0%, 100% { 
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1);
          }
          50% { 
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.02);
          }
        }
        
        @keyframes pulse-glow-gps {
          0%, 100% { 
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1);
            filter: brightness(1);
          }
          50% { 
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.03);
            filter: brightness(1.3);
          }
        }
        
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse-alert {
        @keyframes overdraft-pulse {
  0%, 100% { 
    transform: translate(-50%, -50%) scale(1);
    box-shadow: 0 0 20px rgba(156, 39, 176, 0.7), 0 0 40px rgba(156, 39, 176, 0.4), inset 0 0 10px rgba(255,255,255,0.2);
  }
  50% { 
    transform: translate(-50%, -50%) scale(1.08);
    box-shadow: 0 0 30px rgba(156, 39, 176, 0.9), 0 0 55px rgba(156, 39, 176, 0.5), inset 0 0 15px rgba(255,255,255,0.3);
  }
}

.overdraft-alert-bubble:hover {
  transform: translate(-50%, -50%) scale(1.12) !important;
  box-shadow: 0 0 35px rgba(156, 39, 176, 1), 0 0 65px rgba(156, 39, 176, 0.6) !important;
}

@keyframes overdraft-indicator-pulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 0 10px rgba(156, 39, 176, 0.6);
  }
  50% { 
    transform: scale(1.1);
    box-shadow: 0 0 15px rgba(156, 39, 176, 0.8);
  }
}

@keyframes credit-limit-pulse {
  0%, 100% { 
    transform: translate(-50%, -50%) scale(1);
    box-shadow: 0 0 20px rgba(156, 39, 176, 0.7), 0 0 40px rgba(156, 39, 176, 0.4), inset 0 0 10px rgba(255,255,255,0.2);
  }
  50% { 
    transform: translate(-50%, -50%) scale(1.08);
    box-shadow: 0 0 30px rgba(156, 39, 176, 0.9), 0 0 55px rgba(156, 39, 176, 0.5), inset 0 0 15px rgba(255,255,255,0.3);
  }
}

.credit-limit-bubble:hover {
  transform: translate(-50%, -50%) scale(1.12) !important;
  box-shadow: 0 0 35px rgba(156, 39, 176, 1), 0 0 65px rgba(156, 39, 176, 0.6) !important;
}

@keyframes credit-limit-indicator-pulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 0 10px rgba(156, 39, 176, 0.6);
  }
  50% { 
    transform: scale(1.1);
    box-shadow: 0 0 15px rgba(156, 39, 176, 0.8);
  }
}

@keyframes goal-reached-pulse {
  0%, 100% { 
    transform: translate(-50%, -50%) scale(1);
    box-shadow: 0 0 20px rgba(76, 175, 80, 0.7), 0 0 40px rgba(76, 175, 80, 0.4), inset 0 0 10px rgba(255,255,255,0.2);
  }
  50% { 
    transform: translate(-50%, -50%) scale(1.08);
    box-shadow: 0 0 30px rgba(76, 175, 80, 0.9), 0 0 55px rgba(76, 175, 80, 0.5), inset 0 0 15px rgba(255,255,255,0.3);
  }
}

.goal-reached-bubble:hover {
  transform: translate(-50%, -50%) scale(1.12) !important;
  box-shadow: 0 0 35px rgba(76, 175, 80, 1), 0 0 65px rgba(76, 175, 80, 0.6) !important;
}

@keyframes goal-reached-indicator-pulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 0 10px rgba(76, 175, 80, 0.6);
  }
  50% { 
    transform: scale(1.1);
    box-shadow: 0 0 15px rgba(76, 175, 80, 0.8);
  }
}

@keyframes wrong-direction-indicator-pulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 0 10px rgba(255, 152, 0, 0.6);
  }
  50% { 
    transform: scale(1.15);
    box-shadow: 0 0 18px rgba(255, 152, 0, 0.9);
  }
}
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        
        @keyframes overdraft-pulse {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 0 20px rgba(156, 39, 176, 0.7), 0 0 40px rgba(156, 39, 176, 0.4), inset 0 0 10px rgba(255,255,255,0.2);
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.08);
            box-shadow: 0 0 30px rgba(156, 39, 176, 0.9), 0 0 55px rgba(156, 39, 176, 0.5), inset 0 0 15px rgba(255,255,255,0.3);
          }
        }
        
        .overdraft-alert-bubble:hover {
          transform: translate(-50%, -50%) scale(1.12) !important;
          box-shadow: 0 0 35px rgba(156, 39, 176, 1), 0 0 65px rgba(156, 39, 176, 0.6) !important;
        }
        
        @keyframes overdraft-indicator-pulse {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 0 10px rgba(156, 39, 176, 0.6);
          }
          50% { 
            transform: scale(1.1);
            box-shadow: 0 0 15px rgba(156, 39, 176, 0.8);
          }
        }
        
        @keyframes credit-limit-pulse {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 0 20px rgba(156, 39, 176, 0.7), 0 0 40px rgba(156, 39, 176, 0.4), inset 0 0 10px rgba(255,255,255,0.2);
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.08);
            box-shadow: 0 0 30px rgba(156, 39, 176, 0.9), 0 0 55px rgba(156, 39, 176, 0.5), inset 0 0 15px rgba(255,255,255,0.3);
          }
        }
        
        .credit-limit-bubble:hover {
          transform: translate(-50%, -50%) scale(1.12) !important;
          box-shadow: 0 0 35px rgba(156, 39, 176, 1), 0 0 65px rgba(156, 39, 176, 0.6) !important;
        }
        
        @keyframes credit-limit-indicator-pulse {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 0 10px rgba(156, 39, 176, 0.6);
          }
          50% { 
            transform: scale(1.1);
            box-shadow: 0 0 15px rgba(156, 39, 176, 0.8);
          }
        }
      `}</style>

      {/* Header Timeline FULL WIDTH en haut - TOUJOURS VISIBLE */}
      <div 
        style={{
          padding: '10px 15px 12px',
          background: 'linear-gradient(135deg, #040449 0%, #100261 100%)',
          color: 'white',
          flexShrink: 0,
          borderRadius: '0',
          transition: 'all 0.3s'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          marginBottom: '5px'
        }}>
          <span style={{ fontSize: '0.9em', fontWeight: 'bold' }}>
            🛤️ {t('gps.title')}
            <span style={{ 
              marginLeft: '10px',
              background: viewMode === 'day' 
                ? 'rgba(102, 126, 234, 0.3)' 
                : viewMode === 'month'
                  ? 'rgba(39, 174, 96, 0.3)'
                  : 'rgba(155, 89, 182, 0.3)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '0.9em'
            }}>
              {viewMode === 'day' ? '🔵' : viewMode === 'month' ? '🟢' : '🟣'}
            </span>
            {isTrajectoireAvancee && (
              <span style={{ 
                marginLeft: '10px',
                background: 'rgba(46, 204, 113, 0.3)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.8em'
              }}>
                🔍 {t('gps.advanced')}
              </span>
            )}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.3)' }} />
          
          {/* Bouton Optimisation ♻️ - visible SI pas de badge transactions ET optimisations à reviewer ET pas de demande PL4TO */}
          {!showTransactionBadge && showOptimizationBadge && !isTrajectoireAvancee && !userData?.optimizationRequest?.requested && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOptimizationPopup(true);
              }}
              title={t('budget.optimization.title')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.9em',
                fontWeight: 'bold',
                transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(155, 89, 182, 0.4)'
              }}
            >
              ♻️ {optimizedCount}
            </button>
          )}
          
          {/* 📨 Badge Proposition PL4TO - visible si proposition prête */}
          {activeProposal && activeProposal.status === 'proposal_ready' && !isTrajectoireAvancee && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPL4TOProposal(true);
              }}
              title={t('gps.proposal.badge', 'Proposition d\'optimisation')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.9em',
                fontWeight: 'bold',
                transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(52, 152, 219, 0.4)',
                animation: 'pulse-alert 2s ease-in-out infinite'
              }}
            >
              📨 Proposition
            </button>
          )}
          
          {/* Bouton Recommandation 💡 - DÉSACTIVÉ - Géré par PL4TO maintenant */}
          {/* !hasPendingTransactions && isFullScreen && !isTrajectoireAvancee && paymentRecommendations.length > 0 && !userData?.optimizationRequest?.requested && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentRecommendationIndex(0);
                setShowPaymentRecommendation(paymentRecommendations[0]);
              }}
              title={t('gps.recommendation.title', 'Recommandation')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.9em',
                fontWeight: 'bold',
                transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(243, 156, 18, 0.4)',
                animation: 'pulse-alert 2s ease-in-out infinite'
              }}
            >
              💡 {paymentRecommendations.length}
            </button>
          ) */}
          
          {/* Bouton GO - visible seulement en mode plein écran */}
          {isFullScreen && !isTrajectoireAvancee && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsTrajectoireAvancee(true);
              }}
              title={t('gps.actions.startNavigation')}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #5dade2 0%, #3498db 100%)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.9em',
                fontWeight: 'bold',
                transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(46, 204, 113, 0.4)'
              }}
            >
              🚀 GO
            </button>
          )}
          
          {/* Bouton Retour/Quitter */}
          {(isFullScreen || isTrajectoireAvancee) && !budgetEditPopup && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (isTrajectoireAvancee) {
                  setIsTrajectoireAvancee(false);
                } else if (isMobile && !isPortrait) {
                  // 📱 Mobile en paysage: Afficher popup demandant de pivoter
                  setShowRotateToPortraitPopup(true);
                } else if (isMobile) {
                  // 📱 Mobile en portrait: Ouvrir le sidebar
                  window.dispatchEvent(new Event('openSidebar'));
                } else {
                  // Desktop: Retourner à la page Navigation en mode plein écran avec la date et vue actuelles
                  let currentDateStr = todayStr;
                  if (viewMode === 'year' && selectedYearKey) {
                    currentDateStr = `${selectedYearKey}-01-01`;
                  } else if (viewMode === 'month' && selectedMonthKey) {
                    currentDateStr = `${selectedMonthKey}-01`;
                  } else if (generateDayData?.[selectedRowIndex]?.dateStr) {
                    currentDateStr = generateDayData[selectedRowIndex].dateStr;
                  }
                  navigate(`/gps?date=${currentDateStr}&view=${viewMode}&fullscreen=true`);
                }
              }}
              title={isTrajectoireAvancee ? t('gps.actions.closeAdvanced') : t('gps.actions.backToNavigation', 'Retour à Navigation')}
              style={{
                position: 'relative',
                zIndex: 10000,
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(102, 126, 234, 0.25)',
                color: 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2em',
                fontWeight: '300',
                transition: 'all 0.2s',
                pointerEvents: 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.5)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.25)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              }}
            >
              {isTrajectoireAvancee ? '✕' : '←'}
            </button>
          )}
          
          {/* Bouton Œil pour masquer/afficher les soldes */}
          {(isFullScreen || isTrajectoireAvancee) && (
            <button
              onClick={toggleBalances}
              title={balancesHidden ? t('gps.actions.showBalances') : t('gps.actions.hideBalances')}
              style={{
                background: balancesHidden ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.2)',
                border: balancesHidden ? 'none' : '2px solid rgba(255,255,255,0.3)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.2em',
                transition: 'all 0.3s',
                boxShadow: balancesHidden ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none'
              }}
            >
              {balancesHidden ? '👁️‍🗨️' : '👁️'}
            </button>
          )}
        </div>

        {/* Timeline avec points - TOUJOURS VISIBLE */}
        <div style={{ position: 'relative', height: '60px' }}>
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '0',
              right: '0',
              height: '3px',
              background: 'linear-gradient(90deg, #ffa500, #ff6b00)',
              borderRadius: '2px'
            }} />
            
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '0',
              width: '8%',
              height: '3px',
              background: 'linear-gradient(90deg, #ffa500, #ff6b00)',
              borderRadius: '2px'
            }} />
            
            {/* Logo GPS Mobile - Se déplace avec le scroll, disparaît quand sur un objectif */}
            <div 
              style={{
                position: 'absolute',
                left: `${gpsLogoPosition.percent}%`,
                top: '5px',
                transform: 'translateX(-50%)',
                cursor: 'pointer',
                zIndex: 15,
                transition: 'left 0.3s ease-out, opacity 0.3s ease',
                opacity: gpsLogoPosition.isOnGoal ? 0 : 1 // Disparaît quand sur un objectif
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (viewMode === 'day') {
                  const todayRow = document.getElementById(`row-${todayStr}`);
                  if (todayRow) todayRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  setSelectedRowIndex(0);
                } else if (viewMode === 'month') {
                  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                  setSelectedMonthKey(currentMonthKey);
                  setTimeout(() => {
                    const monthRow = document.getElementById(`month-row-${currentMonthKey}`);
                    if (monthRow) monthRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                } else if (viewMode === 'year') {
                  const currentYearKey = `${today.getFullYear()}`;
                  setSelectedYearKey(currentYearKey);
                  setTimeout(() => {
                    const yearRow = document.getElementById(`year-row-${currentYearKey}`);
                    if (yearRow) yearRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }
              }}
            >
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                border: '3px solid transparent',
                background: 'linear-gradient(#1a1a2e, #1a1a2e) padding-box, linear-gradient(180deg, #ffd700, #ff8c00, #ff4500, #ffd700) border-box',
                animation: 'gps-ring-spin 3s linear infinite',
                boxShadow: '0 0 12px rgba(255, 165, 0, 0.6)',
                transition: 'all 0.3s ease'
              }} />
              <div style={{
                position: 'absolute',
                top: '26px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '1em',
                whiteSpace: 'nowrap',
                fontWeight: 'bold',
                color: '#f39c12',
                transition: 'all 0.3s ease'
              }}>
              </div>
            </div>
            
            {/* Point fixe Aujourd'hui (📍) - visible seulement quand le logo O s'est vraiment déplacé */}
            {gpsLogoPosition.percent > 12 && !gpsLogoPosition.isOnGoal && (
              <div 
                style={{
                  position: 'absolute',
                  left: '8%',
                  top: '5px',
                  transform: 'translateX(-50%)',
                  cursor: 'pointer',
                  zIndex: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  opacity: 1,
                  transition: 'opacity 0.3s ease'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (viewMode === 'day') {
                    const todayRow = document.getElementById(`row-${todayStr}`);
                    if (todayRow) todayRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setSelectedRowIndex(0);
                  } else if (viewMode === 'month') {
                    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                    setSelectedMonthKey(currentMonthKey);
                    setTimeout(() => {
                      const monthRow = document.getElementById(`month-row-${currentMonthKey}`);
                      if (monthRow) monthRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                  }
                }}
                title={t('gps.today', "Aujourd'hui")}
              >
                <div style={{
                  fontSize: '1.1em',
                  color: '#5dade2',
                  textShadow: '0 0 8px rgba(46, 204, 113, 0.5)'
                }}>
                  📍
                </div>
              </div>
            )}
            
            {/* Points des objectifs */}
            {goalsWithProgress
              .filter(g => g.goalReachedDayStr) // Seulement ceux avec une date
              .sort((a, b) => new Date(a.goalReachedDayStr) - new Date(b.goalReachedDayStr))
              .map((goal, idx, arr) => {
              const positionPercent = Math.min(15 + (idx * 20), 85);
              const goalColor = goal.isAchieved ? '#5dade2' : goal.isWrongDirection ? '#ffa500' : '#3498db';
              const goalIcon = goal.isAchieved ? '✓' : goal.isWrongDirection ? '⛔' : '🎯';
              const isLogoOnGoal = gpsLogoPosition.isOnGoal && gpsLogoPosition.nearGoalId === goal.id;
              
              return (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    left: `${positionPercent}%`,
                    top: isLogoOnGoal ? '0px' : '3px',
                    transform: 'translateX(-50%)',
                    cursor: 'pointer',
                    zIndex: isLogoOnGoal ? 20 : 5, // Au-dessus du logo quand actif
                    transition: 'all 0.3s ease'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToGoal(goal);
                  }}
                >
                  <div style={{
                    width: isLogoOnGoal ? '32px' : '24px',
                    height: isLogoOnGoal ? '32px' : '24px',
                    background: isLogoOnGoal 
                      ? `linear-gradient(135deg, ${goalColor}, ${goalColor}dd)` 
                      : goalColor,
                    borderRadius: '50%',
                    border: isLogoOnGoal ? '3px solid #ffd700' : '2px solid white',
                    boxShadow: isLogoOnGoal 
                      ? `0 0 20px ${goalColor}, 0 0 30px rgba(255, 215, 0, 0.6)` 
                      : `0 0 8px ${goalColor}66`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isLogoOnGoal ? '0.85em' : '0.65em',
                    transition: 'all 0.3s ease',
                    animation: isLogoOnGoal ? 'gps-ring-spin 3s linear infinite' : 'none'
                  }}>
                    {goalIcon}
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: '28px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.6em',
                    whiteSpace: 'nowrap',
                    maxWidth: '100px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: goalColor
                  }}>
                    {goal.nom.length > 12 ? goal.nom.substring(0, 12) + '...' : goal.nom}
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: '42px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.55em',
                    whiteSpace: 'nowrap',
                    color: 'rgba(255,255,255,0.7)'
                  }}>
                    {goal.etaLabel || t('gps.goalStatus.toDefine')}
                  </div>
                </div>
              );
            })}
          </div>
      </div>

      {/* Modal Trajectoire Avancée */}
      {isTrajectoireAvancee && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease-out',
            padding: isMobile ? '5px' : '0'
          }}
          onClick={() => setIsTrajectoireAvancee(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '95%',
              maxWidth: '1200px',
              height: isMobile ? '95vh' : '85vh',
              background: 'linear-gradient(135deg, #040449 0%, #100261 100%)',
              borderRadius: isMobile ? '15px' : '25px',
              overflow: 'hidden',
              boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header du modal avec Widget Arrivée à droite */}
            <div style={{
              padding: isMobile ? '10px 12px' : '15px 25px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              {/* Titre à gauche */}
              <h2 style={{ margin: 0, color: 'white', fontSize: isMobile ? '0.9em' : '1.2em', display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px' }}>
                🛤️ {t('gps.trajectory.title')}
              </h2>
              
              {/* Widget Arrivée + Bouton X à droite */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '15px' }}>
                {/* Widget Arrivée */}
                <div style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: isMobile ? '8px' : '12px',
                  padding: isMobile ? '6px 10px' : '10px 18px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '6px' : '12px'
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: isMobile ? '0.65em' : '0.75em' }}>🏁 {t('gps.trajectory.arrival')}</div>
                  {(() => {
                    if (selectedTrajectoirePoint?.type === 'today') {
                      return (
                        <div style={{ color: '#f39c12', fontSize: '0.9em', fontWeight: 'bold' }}>
                          📍 {t('gps.trajectory.youAreHere')}
                        </div>
                      );
                    }
                    
                    if (selectedTrajectoirePoint?.type === 'goal' && selectedTrajectoirePoint?.goal) {
                      const goal = selectedTrajectoirePoint.goal;
                      const targetDateStr = selectedTrajectoirePoint.dateStr;
                      
                      if (targetDateStr) {
                        const targetDate = new Date(targetDateStr + 'T12:00:00');
                        const todayDate = new Date();
                        todayDate.setHours(12, 0, 0, 0);
                        
                        const diffTime = targetDate - todayDate;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const diffMonths = Math.round(diffDays / 30);
                        
                        if (diffDays <= 0) {
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#5dade2' }}>✓ Atteint</span>
                              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75em' }}>🎯 {goal.nom.length > 20 ? goal.nom.slice(0, 20) + '...' : goal.nom}</span>
                            </div>
                          );
                        }
                        
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#3498db' }}>
                              {diffMonths > 0 ? diffMonths + ' mois' : diffDays + ' jours'}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75em' }}>🎯 {goal.nom.length > 20 ? goal.nom.slice(0, 20) + '...' : goal.nom}</span>
                          </div>
                        );
                      }
                    }
                    
                    // Default: prochain objectif
                    const nextGoal = goalsWithProgress
                      .filter(g => !g.isAchieved && !g.isWrongDirection)
                      .sort((a, b) => (a.moisRestants || 999) - (b.moisRestants || 999))[0];
                    
                    return nextGoal ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#3498db' }}>
                          {nextGoal.moisRestants || '?'} mois
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75em' }}>🎯 {nextGoal.nom.length > 20 ? nextGoal.nom.slice(0, 20) + '...' : nextGoal.nom}</span>
                      </div>
                    ) : (
                      <div style={{ color: '#5dade2', fontSize: '0.9em', fontWeight: 'bold' }}>
                        Tous atteints! 🎉
                      </div>
                    );
                  })()}
                </div>
                
                {/* Bouton X */}
                <button
                  onClick={() => setIsTrajectoireAvancee(false)}
                  style={{
                    width: isMobile ? '28px' : '36px',
                    height: isMobile ? '28px' : '36px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: isMobile ? '0.9em' : '1.1em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenu principal - 2 colonnes */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Colonne gauche - Timeline */}
              <div style={{
                width: isMobile ? '200px' : '280px',
                minWidth: isMobile ? '200px' : '280px',
                borderRight: '1px solid rgba(255,255,255,0.1)',
                overflow: 'auto',
                padding: isMobile ? '10px' : '15px'
              }}>
                {/* Titre + Mini-carte de position */}
                <div style={{ marginBottom: isMobile ? '8px' : '15px' }}>
                  <h3 style={{ margin: isMobile ? '0 0 6px' : '0 0 10px', color: 'white', fontSize: isMobile ? '0.75em' : '0.9em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🛤️ {t('gps.trajectory.yourPath')}
                  </h3>
                  
                  {/* Mini-carte de position */}
                  {(() => {
                    const sortedGoals = [...goalsWithProgress].sort((a, b) => (a.moisRestants || 999) - (b.moisRestants || 999));
                    const totalPoints = sortedGoals.length + 1;
                    
                    let currentPosition = 1;
                    if (selectedTrajectoirePoint?.type === 'goal' && selectedTrajectoirePoint?.goalId) {
                      const goalIndex = sortedGoals.findIndex(g => g.id === selectedTrajectoirePoint.goalId);
                      if (goalIndex !== -1) {
                        currentPosition = goalIndex + 2;
                      }
                    }
                    
                    const progressPercent = Math.round((currentPosition / totalPoints) * 100);
                    
                    return (
                      <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7em' }}>📍</span>
                          <div style={{
                            flex: 1,
                            height: '6px',
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: progressPercent + '%',
                              background: 'linear-gradient(90deg, #667eea, #764ba2)',
                              borderRadius: '3px',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <span style={{ color: 'white', fontSize: '0.75em', fontWeight: 'bold', minWidth: '35px', textAlign: 'right' }}>
                            {progressPercent}%
                          </span>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65em', marginTop: '4px', textAlign: 'center' }}>
                          {t('gps.point')} {currentPosition} / {totalPoints}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Point Aujourd'hui */}
                <div 
                  onClick={() => {
                    setSelectedTrajectoirePoint({ type: 'today', dateStr: todayStr, label: t('gps.today') });
                  }}
                  style={{
                    display: 'flex',
                    gap: isMobile ? '8px' : '12px',
                    marginBottom: isMobile ? '6px' : '10px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: isMobile ? '30px' : '40px' }}>
                    <div style={{
                      width: isMobile ? '30px' : '40px',
                      height: isMobile ? '30px' : '40px',
                      borderRadius: '50%',
                      border: selectedTrajectoirePoint?.type === 'today' ? '4px solid transparent' : '3px solid transparent',
                      background: selectedTrajectoirePoint?.type === 'today' 
                        ? 'linear-gradient(#1a1a2e, #1a1a2e) padding-box, linear-gradient(180deg, #ffd700, #ff8c00, #ff4500, #ffd700) border-box'
                        : 'linear-gradient(rgba(26,26,46,0.5), rgba(26,26,46,0.5)) padding-box, linear-gradient(180deg, rgba(255,215,0,0.4), rgba(255,140,0,0.4), rgba(255,69,0,0.4), rgba(255,215,0,0.4)) border-box',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isMobile ? '0.85em' : '1.1em',
                      boxShadow: selectedTrajectoirePoint?.type === 'today' ? '0 0 15px rgba(255, 165, 0, 0.6)' : 'none',
                      animation: selectedTrajectoirePoint?.type === 'today' ? 'gps-ring-spin 3s linear infinite' : 'none',
                      transition: 'all 0.3s'
                    }}>
                    </div>
                    <div style={{ width: '2px', height: isMobile ? '12px' : '20px', background: 'linear-gradient(180deg, #f39c12, rgba(255,255,255,0.2))' }} />
                  </div>
                  <div style={{
                    flex: 1,
                    background: selectedTrajectoirePoint?.type === 'today' ? 'rgba(243, 156, 18, 0.2)' : 'rgba(255,255,255,0.05)',
                    border: selectedTrajectoirePoint?.type === 'today' ? '2px solid #f39c12' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: isMobile ? '8px' : '10px',
                    padding: isMobile ? '6px 8px' : '10px 12px',
                    transition: 'all 0.3s'
                  }}>
                    <div style={{ fontWeight: 'bold', color: selectedTrajectoirePoint?.type === 'today' ? '#f39c12' : 'white', fontSize: isMobile ? '0.7em' : '0.85em' }}>
                      📍 {t('gps.today')}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: isMobile ? '0.6em' : '0.7em' }}>
                      {new Date().toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Objectifs */}
                {goalsWithProgress
                  .sort((a, b) => (a.moisRestants || 999) - (b.moisRestants || 999))
                  .map((goal, idx) => {
                    const goalColor = goal.isAchieved ? '#5dade2' : goal.isWrongDirection ? '#ffa500' : '#667eea';
                    const isSelected = selectedTrajectoirePoint?.type === 'goal' && selectedTrajectoirePoint?.goalId === goal.id;
                    const isLast = idx === goalsWithProgress.length - 1;
                    
                    // Date exacte de l'objectif
                    const goalDateStr = goal.goalReachedDayStr || null;
                    const goalDateLabel = goalDateStr 
                      ? new Date(goalDateStr + 'T12:00:00').toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short', year: 'numeric' })
                      : goal.etaLabel || t('gps.goalStatus.toDefine');
                    
                    return (
                      <div 
                        key={idx}
                        onClick={() => {
                          setSelectedTrajectoirePoint({ 
                            type: 'goal', 
                            goalId: goal.id, 
                            dateStr: goal.goalReachedDayStr || todayStr,
                            label: goal.nom,
                            goal: goal
                          });
                        }}
                        style={{
                          display: 'flex',
                          gap: isMobile ? '8px' : '12px',
                          marginBottom: isLast ? '0' : (isMobile ? '6px' : '10px'),
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: isMobile ? '30px' : '40px' }}>
                          <div style={{
                            width: isMobile ? '30px' : '40px',
                            height: isMobile ? '30px' : '40px',
                            borderRadius: '50%',
                            background: isSelected ? goalColor : goalColor + '44',
                            border: isSelected ? '3px solid ' + goalColor : '2px solid ' + goalColor + '88',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: isMobile ? '0.75em' : '1em',
                            boxShadow: isSelected ? '0 0 15px ' + goalColor + '66' : 'none',
                            transition: 'all 0.3s'
                          }}>
                            {goal.isAchieved ? '✓' : goal.isWrongDirection ? '⛔' : '🎯'}
                          </div>
                          {!isLast && (
                            <div style={{ width: '2px', height: isMobile ? '12px' : '20px', background: 'rgba(255,255,255,0.2)' }} />
                          )}
                        </div>
                        <div style={{
                          flex: 1,
                          background: isSelected ? goalColor + '33' : 'rgba(255,255,255,0.05)',
                          border: isSelected ? '2px solid ' + goalColor : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: isMobile ? '8px' : '10px',
                          padding: isMobile ? '6px 8px' : '10px 12px',
                          transition: 'all 0.3s'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 'bold', color: isSelected ? goalColor : 'white', fontSize: isMobile ? '0.65em' : '0.8em' }}>
                              {goal.nom}
                            </div>
                            <div style={{
                              background: goalColor,
                              padding: isMobile ? '1px 5px' : '2px 8px',
                              borderRadius: '12px',
                              fontSize: isMobile ? '0.55em' : '0.65em',
                              fontWeight: 'bold',
                              color: 'white'
                            }}>
                              {(goal.progression || 0).toFixed(0)}%
                            </div>
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: isMobile ? '0.55em' : '0.65em', marginTop: '2px' }}>
                            {goalDateLabel}
                          </div>
                          {/* Mini barre de progression */}
                          <div style={{
                            marginTop: isMobile ? '4px' : '6px',
                            height: isMobile ? '2px' : '3px',
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: Math.min(100, goal.progression || 0) + '%',
                              background: goalColor,
                              borderRadius: '2px'
                            }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Colonne droite - Soldes des comptes */}
              <div style={{
                flex: 1,
                overflow: 'auto',
                padding: isMobile ? '10px' : '15px 20px',
                background: 'rgba(255,255,255,0.02)'
              }}>
                <h3 style={{ margin: isMobile ? '0 0 8px' : '0 0 15px', color: 'white', fontSize: isMobile ? '0.8em' : '0.9em', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  🏦 {t('gps.balances')} - {selectedTrajectoirePoint?.label || t('gps.today')}
                  <span style={{ fontSize: isMobile ? '0.65em' : '0.75em', opacity: 0.6, fontWeight: 'normal', marginLeft: isMobile ? '0' : '8px' }}>
                    {(() => {
                      const dateStr = selectedTrajectoirePoint?.dateStr || todayStr;
                      const d = new Date(dateStr + 'T12:00:00');
                      return d.toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', year: 'numeric' });
                    })()}
                  </span>
                </h3>

                {/* Grille des comptes */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: isMobile ? '8px' : '12px',
                  marginBottom: isMobile ? '10px' : '15px'
                }}>
                  {accounts.map((acc, idx) => {
                    // Trouver le solde à la date sélectionnée dans allDayData
                    const targetDateStr = selectedTrajectoirePoint?.dateStr || todayStr;
                    
                    let solde = acc.solde;
                    let soldeAujourdhui = acc.solde;
                    
                    // Chercher dans allDayData (qui contient toutes les données sur 54 ans)
                    const dayData = allDayData.find(d => d.dateStr === targetDateStr);
                    if (dayData && dayData.accounts[acc.nom]) {
                      solde = dayData.accounts[acc.nom].solde;
                    }
                    
                    // Solde d'aujourd'hui pour calculer la différence
                    const todayData = allDayData.find(d => d.dateStr === todayStr);
                    if (todayData && todayData.accounts[acc.nom]) {
                      soldeAujourdhui = todayData.accounts[acc.nom].solde;
                    }
                    
                    const difference = solde - soldeAujourdhui;
                    const isCredit = acc.type === 'credit';
                    const showDifference = selectedTrajectoirePoint?.type === 'goal' && targetDateStr !== todayStr;
                    
                    // Vérifier si c'est un objectif et si ce compte est concerné
                    const selectedGoal = selectedTrajectoirePoint?.goal;
                    const isGoalAccount = selectedGoal && selectedGoal.compteAssocie === acc.nom;
                    
                    // Mini graphique: collecter les derniers points
                    let miniChartData = [];
                    if (isGoalAccount && selectedGoal) {
                      // Prendre 6 points entre aujourd'hui et la date de l'objectif
                      const startDate = new Date(todayStr + 'T12:00:00');
                      const endDate = new Date(targetDateStr + 'T12:00:00');
                      const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
                      const step = Math.max(1, Math.floor(totalDays / 5));
                      
                      for (let i = 0; i <= 5; i++) {
                        const checkDate = new Date(startDate);
                        checkDate.setDate(checkDate.getDate() + (i * step));
                        const checkDateStr = checkDate.toISOString().split('T')[0];
                        const checkData = allDayData.find(d => d.dateStr === checkDateStr);
                        if (checkData && checkData.accounts[acc.nom]) {
                          miniChartData.push(checkData.accounts[acc.nom].solde);
                        }
                      }
                    }
                    
                    return (
                      <div 
                        key={idx}
                        style={{
                          background: isGoalAccount 
                            ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3))'
                            : 'white',
                          borderRadius: isMobile ? '10px' : '15px',
                          padding: isMobile ? '10px' : '15px',
                          boxShadow: isGoalAccount 
                            ? '0 0 20px rgba(102, 126, 234, 0.3)'
                            : '0 2px 10px rgba(0,0,0,0.1)',
                          border: isGoalAccount ? '2px solid #667eea' : 'none',
                          transition: 'all 0.4s ease-out',
                          position: 'relative',
                          overflow: 'visible'
                        }}
                      >
                        {/* Étoile dorée pour compte d'objectif */}
                        {isGoalAccount && (
                          <div style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '-10px',
                            fontSize: isMobile ? '1.2em' : '1.8em',
                            filter: 'drop-shadow(0 0 8px rgba(241, 196, 15, 0.8))',
                            animation: 'star-float 2s ease-in-out infinite',
                            zIndex: 10
                          }}>
                            ⭐
                          </div>
                        )}
                        
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: isMobile ? '5px' : '8px',
                          marginBottom: isMobile ? '4px' : '8px'
                        }}>
                          <span style={{ fontSize: isMobile ? '1em' : '1.3em' }}>
                            {acc.type === 'cheque' ? '💳' : acc.type === 'epargne' ? '🐷' : '🏦'}
                          </span>
                          <div style={{ 
                            fontWeight: 'bold', 
                            color: isGoalAccount ? 'white' : '#2c3e50',
                            fontSize: isMobile ? '0.7em' : '0.85em'
                          }}>
                            {acc.nom}
                          </div>
                        </div>
                        
                        {/* Solde avec animation */}
                        <div style={{
                          fontSize: isMobile ? '1.1em' : '1.5em',
                          fontWeight: 'bold',
                          color: isGoalAccount ? 'white' : (isCredit ? '#ffa500' : '#5dade2'),
                          transition: 'all 0.3s ease-out'
                        }}>
                          {formatMontant(solde || 0)}
                        </div>
                        
                        {/* Différence avec aujourd'hui */}
                        {showDifference && Math.abs(difference) > 0.01 && (
                          <div style={{
                            marginTop: '4px',
                            fontSize: '0.75em',
                            fontWeight: 'bold',
                            color: isGoalAccount 
                              ? (difference >= 0 ? '#90EE90' : '#FFB6C1')
                              : (difference >= 0 ? '#3498db' : '#ffa500'),
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>{difference >= 0 ? '📈' : '📉'}</span>
                            <span>{difference >= 0 ? '+' : ''}{formatMontant(difference)}</span>
                            <span style={{ opacity: 0.7, fontWeight: 'normal' }}>{t('gps.vsToday')}</span>
                          </div>
                        )}
                        
                        {/* Mini graphique d'évolution pour compte d'objectif */}
                        {isGoalAccount && miniChartData.length > 1 && (
                          <div style={{
                            marginTop: '10px',
                            paddingTop: '10px',
                            borderTop: '1px solid rgba(255,255,255,0.2)'
                          }}>
                            <div style={{ fontSize: '0.65em', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                              📊 {t('gps.trajectory.expectedEvolution')}
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-end',
                              gap: '3px',
                              height: '30px'
                            }}>
                              {(() => {
                                const minVal = Math.min(...miniChartData);
                                const maxVal = Math.max(...miniChartData);
                                const range = maxVal - minVal || 1;
                                
                                return miniChartData.map((val, i) => {
                                  const height = Math.max(4, ((val - minVal) / range) * 26);
                                  const isLast = i === miniChartData.length - 1;
                                  return (
                                    <div
                                      key={i}
                                      style={{
                                        flex: 1,
                                        height: height + 'px',
                                        background: isLast 
                                          ? 'linear-gradient(180deg, #5dade2, #3498db)'
                                          : 'rgba(255,255,255,0.3)',
                                        borderRadius: '2px',
                                        transition: 'height 0.3s ease-out'
                                      }}
                                    />
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                        
                        {/* Info objectif si applicable */}
                        {isGoalAccount && selectedGoal && (
                          <div style={{
                            marginTop: '10px',
                            paddingTop: '10px',
                            borderTop: '1px solid rgba(255,255,255,0.2)'
                          }}>
                            <div style={{ fontSize: '0.7em', color: 'rgba(255,255,255,0.8)' }}>
                              🎯 {t('gps.trajectory.goal')}: {formatMontant(selectedGoal.montantCible || 0)}
                            </div>
                            <div style={{
                              marginTop: '6px',
                              height: '6px',
                              background: 'rgba(255,255,255,0.2)',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                height: '100%',
                                width: Math.min(100, selectedGoal.progression || 0) + '%',
                                background: 'linear-gradient(90deg, #5dade2, #3498db)',
                                borderRadius: '3px',
                                transition: 'width 0.5s ease-out'
                              }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Recommandation - avec bouton Naviguez! si objectif sélectionné */}
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  padding: '15px',
                  color: 'white'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1em' }}>💡</span>
                    <span style={{ fontWeight: 'bold', fontSize: '0.85em' }}>{t('gps.trajectory.recommendation')}</span>
                  </div>
                  
                  {selectedTrajectoirePoint?.type === 'goal' && selectedTrajectoirePoint?.goal ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                      <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.4, fontSize: '0.8em', flex: 1 }}>
                        {t('gps.trajectory.recommendationUpdate')}
                      </p>
                      <button
                        onClick={() => {
                          setIsTrajectoireAvancee(false);
                          navigateToGoal(selectedTrajectoirePoint.goal);
                        }}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #5dade2 0%, #3498db 100%)',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '0.85em',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 15px rgba(46, 204, 113, 0.4)',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        🚀 {t('gps.trajectory.navigateTo')}
                      </button>
                    </div>
                  ) : (
                    <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.4, fontSize: '0.8em' }}>
                      {budgetBalance.balance < 0 
                        ? t('budget.balance.negative', { amount: formatMontant(Math.abs(budgetBalance.balance)) })
                        : t('gps.trajectory.selectGoal')
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal - Vue Normale */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

      <div style={{
        width: '200px',
        minWidth: '200px',
        background: 'transparent',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '0',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '36px 15px', 
          background: 'transparent',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          minHeight: '100px'
        }}>
          {/* Animation de changement de vue */}
          {isViewChanging && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(4, 4, 73, 0.95)',
              zIndex: 10
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                {/* Cercles animés représentant le niveau de zoom */}
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center'
                }}>
                  {viewMode === 'day' && (
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      animation: 'view-zoom-in 0.4s ease-out',
                      boxShadow: '0 0 15px rgba(102, 126, 234, 0.6)'
                    }} />
                  )}
                  {viewMode === 'month' && (
                    <>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)',
                        animation: 'view-zoom-in 0.3s ease-out',
                        boxShadow: '0 0 10px rgba(39, 174, 96, 0.6)'
                      }} />
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)',
                        animation: 'view-zoom-in 0.4s ease-out 0.1s backwards',
                        boxShadow: '0 0 10px rgba(39, 174, 96, 0.6)'
                      }} />
                    </>
                  )}
                  {viewMode === 'year' && (
                    <>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                        animation: 'view-zoom-in 0.25s ease-out',
                        boxShadow: '0 0 8px rgba(155, 89, 182, 0.6)'
                      }} />
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                        animation: 'view-zoom-in 0.3s ease-out 0.08s backwards',
                        boxShadow: '0 0 8px rgba(155, 89, 182, 0.6)'
                      }} />
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                        animation: 'view-zoom-in 0.35s ease-out 0.16s backwards',
                        boxShadow: '0 0 8px rgba(155, 89, 182, 0.6)'
                      }} />
                    </>
                  )}
                </div>
              </div>
              <span style={{
                fontSize: '0.75em',
                color: 'rgba(255,255,255,0.8)',
                animation: 'view-text-fade 0.4s ease-out'
              }}>
                {viewMode === 'day' ? '🔵' : viewMode === 'month' ? '🟢🟢' : '🟣🟣🟣'}
              </span>
            </div>
          )}
          
          {/* Animation de navigation vers objectif - 3 cercles rebondissants */}
          {isNavigatingToGoal && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              zIndex: 10
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {/* 3 cercles qui rebondissent */}
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  animation: 'goal-bounce 0.6s ease-in-out infinite',
                  animationDelay: '0s',
                  boxShadow: '0 0 15px rgba(102, 126, 234, 0.6)'
                }} />
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)',
                  animation: 'goal-bounce 0.6s ease-in-out infinite',
                  animationDelay: '0.15s',
                  boxShadow: '0 0 15px rgba(39, 174, 96, 0.6)'
                }} />
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                  animation: 'goal-bounce 0.6s ease-in-out infinite',
                  animationDelay: '0.3s',
                  boxShadow: '0 0 15px rgba(155, 89, 182, 0.6)'
                }} />
              </div>
            </div>
          )}
          
          <h2 style={{ 
              fontSize: isMobileLandscape ? '0.75em' : '1em', 
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '8px',
              color: '#f39c12',
              opacity: (isViewChanging || isNavigatingToGoal) ? 0 : 1,
              transition: 'opacity 0.2s'
            }}>
              {t('gps.navigation.title')}
            </h2>
          <p style={{ fontSize: isMobileLandscape ? '0.6em' : '0.8em', opacity: (isViewChanging || isNavigatingToGoal) ? 0 : 0.8, margin: isMobileLandscape ? '0' : '4px 0 0', transition: 'opacity 0.2s', whiteSpace: isMobileLandscape ? 'nowrap' : 'normal' }}>
            {t('gps.navigation.subtitle')}
          </p>
        </div>

        {/* Bouton de vue - caché en mode Itinéraire */}
        {!isMobileLandscape && (
        <div style={{ padding: '15px' }}>
          {/* Bouton de vue dynamique - affiche le mode actuel */}
          <div>
            <button
              style={{
                width: '100%',
                padding: '12px 15px',
                borderRadius: '12px',
                border: 'none',
                background: viewMode === 'day' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : viewMode === 'month'
                    ? 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)'
                    : 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                color: 'white',
                fontSize: '0.95em',
                fontWeight: '600',
                cursor: 'default',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.3s',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              }}
            >
              {viewMode === 'day' ? '🔵' : viewMode === 'month' ? '🟢' : '🟣'}
            </button>
          </div>
        </div>
        )}

        {viewMode === 'day' && (
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            padding: isMobileLandscape ? '5px 8px 5px' : '10px 15px 20px',
            borderTop: isMobileLandscape ? 'none' : '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ position: 'relative', paddingLeft: isMobileLandscape ? '5px' : '25px' }}>
              {/* Timeline jaune - cachée en mode Itinéraire */}
              {!isMobileLandscape && (
              <div style={{
                position: 'absolute',
                left: '8px',
                top: '10px',
                bottom: '10px',
                width: '3px',
                background: 'linear-gradient(180deg, #ffa500, #ff6b00)',
                borderRadius: '2px'
              }} />
              )}

              {generateDayData
                .map((item, originalIndex) => ({ ...item, originalIndex }))
                .filter(item => item.hasActivity || item.isToday)
                .slice().reverse()
                .map((item) => {
              return (
                <div
                  key={item.originalIndex}
                  onClick={() => {
                    scrollToRow(item.originalIndex);
                  }}
                  style={{
                    position: 'relative',
                    padding: isMobileLandscape ? '5px 0' : '8px 0',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    transition: 'background 0.2s, transform 0.2s',
                    background: selectedRowIndex === item.originalIndex ? 'rgba(102, 126, 234, 0.3)' : 'transparent',
                    borderRadius: '8px',
                    marginBottom: isMobileLandscape ? '0px' : '2px'
                  }}
                >
                  {/* Point de la timeline - caché en mode Itinéraire */}
                  {!isMobileLandscape && (
                  <div style={{
                    position: 'absolute',
                    left: '-21px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: item.isToday ? '12px' : '8px',
                    height: item.isToday ? '12px' : '8px',
                    borderRadius: '50%',
                    background: item.isToday
                      ? 'linear-gradient(135deg, #f39c12, #ffa500)'
                      : item.isModified
                        ? 'linear-gradient(135deg, #9b59b6, #8e44ad)'
                        : selectedRowIndex === item.originalIndex
                          ? '#667eea'
                          : 'rgba(255,255,255,0.4)',
                    border: item.isToday ? '2px solid white' : 'none',
                    boxShadow: item.isToday ? '0 0 8px rgba(243, 156, 18, 0.6)' : 'none'
                  }} />
                  )}

                  <span style={{
                    fontSize: isMobileLandscape ? '0.75em' : '0.8em',
                    fontWeight: item.isToday || selectedRowIndex === item.originalIndex || item.isModified ? 'bold' : 'normal',
                    opacity: item.isToday || selectedRowIndex === item.originalIndex || item.isModified ? 1 : 0.7,
                    color: item.isModified ? '#bb8fce' : 'inherit'
                  }}>
                    {item.isModified ? '★ ' : ''}{item.shortLabel}
                  </span>

                  {item.isToday && (
                    <span style={{ 
                      fontSize: '0.6em', 
                      marginLeft: '6px',
                      background: 'rgba(243, 156, 18, 0.3)',
                      padding: '2px 5px',
                      borderRadius: '8px'
                    }}>
                      {t('gps.today')}
                    </span>
                  )}
                  
                </div>
              );})
              }
            </div>
          </div>
        )}

        {viewMode === 'month' && (
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            padding: '10px 15px 20px',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ position: 'relative', paddingLeft: '25px' }}>
              <div style={{
                position: 'absolute',
                left: '8px',
                top: '10px',
                bottom: '10px',
                width: '3px',
                background: 'linear-gradient(180deg, #ffa500, #ff6b00)',
                borderRadius: '2px'
              }} />

              {generateMonthData
                .map((item, originalIndex) => ({ ...item, originalIndex }))
                .filter(item => item.hasActivity || item.isCurrentMonth)
                .slice().reverse()
                .map((item) => (
                <div
                  key={item.monthKey}
                  id={`sidebar-month-${item.monthKey}`}
                  onClick={() => {
                    // Sélectionner et scroller vers le mois
                    setSelectedMonthKey(item.monthKey);
                    const element = document.getElementById(`month-row-${item.monthKey}`);
                    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  style={{
                    position: 'relative',
                    padding: '10px 0',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    transition: 'background 0.2s',
                    background: selectedMonthKey === item.monthKey ? 'rgba(39, 174, 96, 0.3)' : 'transparent',
                    borderRadius: '8px',
                    marginBottom: '2px'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    left: '-21px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: item.isCurrentMonth ? '14px' : '10px',
                    height: item.isCurrentMonth ? '14px' : '10px',
                    borderRadius: '50%',
                    background: item.isCurrentMonth 
                      ? 'linear-gradient(135deg, #3498db, #5dade2)' 
                      : item.hasModification
                        ? 'linear-gradient(135deg, #9b59b6, #8e44ad)'
                        : selectedMonthKey === item.monthKey 
                          ? '#3498db'
                          : 'rgba(255,255,255,0.4)',
                    border: item.isCurrentMonth ? '2px solid white' : 'none',
                    boxShadow: item.isCurrentMonth ? '0 0 10px rgba(39, 174, 96, 0.6)' : 'none'
                  }} />

                  <span style={{
                    fontSize: '0.85em',
                    fontWeight: item.isCurrentMonth || selectedMonthKey === item.monthKey || item.hasModification ? 'bold' : 'normal',
                    opacity: item.isCurrentMonth || selectedMonthKey === item.monthKey || item.hasModification ? 1 : 0.7,
                    color: item.hasModification ? '#bb8fce' : 'inherit'
                  }}>
                    {item.hasModification ? '★ ' : ''}{item.label}
                  </span>
                  {item.isCurrentMonth && (
                    <span style={{ 
                      fontSize: '0.6em', 
                      marginLeft: '6px',
                      background: 'rgba(39, 174, 96, 0.3)',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      display: 'block',
                      marginTop: '3px'
                    }}>
                      {t('gps.currentMonth')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'year' && (
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            padding: '10px 15px 20px',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ position: 'relative', paddingLeft: '25px' }}>
              <div style={{
                position: 'absolute',
                left: '8px',
                top: '10px',
                bottom: '10px',
                width: '3px',
                background: 'linear-gradient(180deg, #ffa500, #ff6b00)',
                borderRadius: '2px'
              }} />

              {generateYearData
                .filter(item => item.hasActivity || item.isCurrentYear)
                .slice().reverse()
                .map((item) => (
                <div
                  key={item.yearKey}
                  id={`sidebar-year-${item.yearKey}`}
                  onClick={() => {
                    // Sélectionner et scroller vers l'année
                    setSelectedYearKey(item.yearKey);
                    const element = document.getElementById(`year-row-${item.yearKey}`);
                    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  style={{
                    position: 'relative',
                    padding: '12px 0',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    transition: 'background 0.2s',
                    background: selectedYearKey === item.yearKey ? 'rgba(155, 89, 182, 0.3)' : 'transparent',
                    borderRadius: '8px',
                    marginBottom: '2px'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    left: '-21px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: item.isCurrentYear ? '16px' : '12px',
                    height: item.isCurrentYear ? '16px' : '12px',
                    borderRadius: '50%',
                    background: item.isCurrentYear 
                      ? 'linear-gradient(135deg, #9b59b6, #8e44ad)' 
                      : item.hasModification
                        ? 'linear-gradient(135deg, #9b59b6, #8e44ad)'
                        : selectedYearKey === item.yearKey 
                          ? '#9b59b6'
                          : 'rgba(255,255,255,0.4)',
                    border: item.isCurrentYear ? '2px solid white' : 'none',
                    boxShadow: item.isCurrentYear ? '0 0 10px rgba(155, 89, 182, 0.6)' : 'none'
                  }} />

                  <span style={{
                    fontSize: '1em',
                    fontWeight: item.isCurrentYear || selectedYearKey === item.yearKey || item.hasModification ? 'bold' : 'normal',
                    opacity: item.isCurrentYear || selectedYearKey === item.yearKey || item.hasModification ? 1 : 0.7,
                    color: item.hasModification && !item.isCurrentYear ? '#bb8fce' : 'inherit'
                  }}>
                    {item.hasModification ? '★ ' : ''}{item.label}
                  </span>
                  {item.isCurrentYear && (
                    <span style={{ 
                      fontSize: '0.6em', 
                      marginLeft: '8px',
                      background: 'rgba(155, 89, 182, 0.3)',
                      padding: '2px 6px',
                      borderRadius: '8px'
                    }}>
                      {t('gps.currentYear')}
                    </span>
                  )}
                  {item.isPartialYear && (
                    <span style={{
                      fontSize: '0.55em',
                      display: 'block',
                      opacity: 0.7,
                      marginTop: '2px'
                    }}>
                      (depuis {monthsShort[item.startMonth]})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{
        flex: 1,
        background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
        borderRadius: '0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>

        <div style={{
          display: 'flex',
          padding: '10px 15px',
          gap: '12px',
          background: 'rgba(4, 4, 73, 0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Panneau de direction GPS */}
          <div style={{
            width: isMobileLandscape ? '50px' : '80px',
            minWidth: isMobileLandscape ? '50px' : '80px',
            textAlign: 'center',
            padding: isMobileLandscape ? '8px 4px' : '12px 8px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s ease'
          }}>
            <span style={{ 
              fontSize: '2em',
              color: 'white',
              transition: 'all 0.3s ease',
              textShadow: '0 2px 10px rgba(255,255,255,0.3)'
            }}>
              {scrollDirection === 'forward' ? '⇧' : '⇩'}
            </span>
          </div>

          {accounts.map(acc => {
            const alert = creditLimitAlerts[acc.nom];
            const hasAlert = alert && alert.isApproachingLimit;
            
            const handleAccountClick = () => {
              if (hasAlert && alert.limitReachedDateStr) {
                if (viewMode === 'day' && alert.daysUntilLimit !== null) {
                  const element = document.getElementById(`row-${alert.limitReachedDateStr}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('goal-glow-orange');
                    setTimeout(() => element.classList.remove('goal-glow-orange'), 3000);
                  }
                } else if (viewMode === 'month') {
                  // Extraire le mois de la date (YYYY-MM-DD -> YYYY-MM)
                  const monthKey = alert.limitReachedDateStr.substring(0, 7);
                  setSelectedMonthKey(monthKey);
                  setTimeout(() => {
                    const element = document.getElementById(`month-row-${monthKey}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      element.classList.add('goal-glow-orange');
                      setTimeout(() => element.classList.remove('goal-glow-orange'), 3000);
                    }
                  }, 200);
                } else if (viewMode === 'year') {
                  // Extraire l'année de la date (YYYY-MM-DD -> YYYY)
                  const yearKey = alert.limitReachedDateStr.substring(0, 4);
                  setSelectedYearKey(yearKey);
                  setTimeout(() => {
                    const element = document.getElementById(`year-row-${yearKey}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      element.classList.add('goal-glow-orange');
                      setTimeout(() => element.classList.remove('goal-glow-orange'), 3000);
                    }
                  }, 200);
                }
              } else {
                navigate(`/comptes?highlight=${encodeURIComponent(acc.nom)}`);
              }
            };
            
            return (
              <div
                key={acc.nom}
                onClick={handleAccountClick}
                className={hasAlert ? 'account-header-alert' : 'account-card-glass'}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: isMobileLandscape ? '8px 6px' : '12px 10px',
                  background: hasAlert 
                    ? 'linear-gradient(135deg, rgba(243, 156, 18, 0.3), rgba(230, 126, 34, 0.2))'
                    : 'linear-gradient(180deg, rgba(26, 35, 126, 0.6) 0%, rgba(13, 17, 63, 0.7) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: isMobileLandscape ? '10px' : '15px',
                  border: hasAlert 
                    ? '2px solid #f39c12'
                    : isMobileLandscape ? '2px solid rgba(255, 255, 255, 0.3)' : '3px solid rgba(255, 255, 255, 0.4)',
                  boxShadow: hasAlert 
                    ? undefined 
                    : '0 0 20px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
                  minWidth: isMobileLandscape ? '90px' : '140px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!hasAlert) {
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(255,255,255,0.25), inset 0 1px 0 rgba(255,255,255,0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!hasAlert) {
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.3)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                  }
                }}
                title={hasAlert 
                  ? `⚠️ Limite atteinte le ${alert.limitReachedDateStr}\nCliquez pour voir cette date`
                  : `Voir le compte ${acc.nom}`
                }
              >
                {hasAlert && (
                  <div 
                    className="alert-badge-blink"
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: 'linear-gradient(135deg, #f39c12, #e67e22)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8em',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 8px rgba(243, 156, 18, 0.5)',
                      zIndex: 10
                    }}
                  >
                    ⚠️
                  </div>
                )}
                
                {hasAlert && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#f39c12',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.6em',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    zIndex: 5
                  }}>
                    ⚠️ {t('gps.alerts.alert')}
                  </div>
                )}
                
                <span style={{ fontSize: isMobileLandscape ? '1em' : '1.3em' }}>{getAccountIcon(acc.type)}</span>
                <p style={{ 
                  margin: isMobileLandscape ? '3px 0 1px' : '5px 0 2px', 
                  fontWeight: 'bold', 
                  fontSize: isMobileLandscape ? '0.7em' : '0.9em',
                  color: hasAlert ? '#ffa726' : 'white',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {acc.nom}
                </p>
                <p style={{
                  margin: 0,
                  fontSize: isMobileLandscape ? '0.55em' : '0.7em',
                  color: hasAlert ? '#ffb74d' : 'rgba(255, 255, 255, 0.7)'
                }}>
                  {getTypeLabel(acc.type)}
                </p>
              </div>
            );
          })}
        </div>

        <div 
          ref={scrollContainerRef}
          onScroll={(e) => {
            const currentScrollTop = e.target.scrollTop;
            if (currentScrollTop > lastScrollTop.current) {
              setScrollDirection('backward'); // Scroll down = reculer dans le temps (vers le passé)
            } else if (currentScrollTop < lastScrollTop.current) {
              setScrollDirection('forward'); // Scroll up = avancer dans le temps (vers le futur)
            }
            lastScrollTop.current = currentScrollTop;
            
            // Détecter la date au centre de l'écran pour le logo GPS
            const container = e.target;
            const containerRect = container.getBoundingClientRect();
            const centerY = containerRect.top + containerRect.height / 2;
            
            // Trouver l'élément row au centre
            const rows = container.querySelectorAll('[data-date], [data-month], [data-year]');
            let closestRow = null;
            let closestDistance = Infinity;
            
            rows.forEach(row => {
              const rowRect = row.getBoundingClientRect();
              const rowCenterY = rowRect.top + rowRect.height / 2;
              const distance = Math.abs(rowCenterY - centerY);
              if (distance < closestDistance) {
                closestDistance = distance;
                closestRow = row;
              }
            });
            
            if (closestRow) {
              const dateStr = closestRow.dataset.date || closestRow.dataset.month || closestRow.dataset.year;
              setCurrentVisibleDateStr(dateStr);
            }
          }}
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '10px 15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            position: 'relative'
          }}
        >
          <div className="scroll-depth-top" />
          
          <div style={{ height: '5px', flexShrink: 0 }} />

          {viewMode === 'day' && displayData.slice().reverse().map((row) => {
            const isSelected = generateDayData[selectedRowIndex]?.dateStr === row.dateStr;
            const isVisible = visibleRows.has(row.dateStr);
            const animatingRow = animatingAccounts[row.dateStr] || {};
            const isTransferActive = activeTransferRows.has(row.dateStr);
            const isActivityActive = activeActivityRows.has(row.dateStr);
            
            const hasLimitExceededInRow = accounts.some(acc => {
              const alert = creditLimitAlerts[acc.nom];
              const accountData = row.accounts[acc.nom];
              return alert && alert.limite && accountData && accountData.solde >= alert.limite;
            });
            
            return (
              <div
                key={row.dateStr}
                id={`row-${row.dateStr}`}
                ref={el => rowRefs.current[row.dateStr] = el}
                data-date={row.dateStr}
                className={`roller-row ${isVisible ? 'visible' : ''}`}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'stretch',
                  background: hasLimitExceededInRow 
                    ? 'rgba(243, 156, 18, 0.12)' 
                    : isSelected 
                      ? 'rgba(102, 126, 234, 0.15)' 
                      : row.isToday 
                        ? 'rgba(243, 156, 18, 0.1)' 
                        : 'transparent',
                  padding: '4px',
                  borderRadius: '18px',
                  border: hasLimitExceededInRow 
                    ? '2px solid rgba(243, 156, 18, 0.6)' 
                    : isSelected 
                      ? '2px solid rgba(102, 126, 234, 0.5)' 
                      : '2px solid transparent',
                  position: 'relative',
                  opacity: isVisible ? 1 : 0.7
                }}
              >
                <div 
                  className="date-cell"
                  style={{
                    width: isMobileLandscape ? '55px' : '80px',
                    minWidth: isMobileLandscape ? '55px' : '80px',
                    minHeight: isMobileLandscape ? '50px' : '70px',
                    borderRadius: isMobileLandscape ? '12px' : '18px',
                    background: row.isToday 
                      ? 'linear-gradient(135deg, #f39c12 0%, #ffa500 100%)' 
                      : 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: row.isToday 
                      ? '0 6px 20px rgba(243, 156, 18, 0.4)' 
                      : 'none',
                    border: row.isToday ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
                    padding: isMobileLandscape ? '6px 3px' : '10px 5px',
                    animation: row.isToday ? 'pulse-today 2s infinite' : 'none'
                  }}
                >
                  <button
                    className="edit-budget-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      openBudgetEdit(row.dateStr, row.label, 'day');
                    }}
                    title="Modifier le budget à partir de cette date"
                  >
                    ✏️
                  </button>
                  <span style={{ fontSize: isMobileLandscape ? '0.65em' : '0.85em', fontWeight: 'bold', textAlign: 'center' }}>
                    {row.shortLabel}
                  </span>
                  {row.isToday && (
                    <span style={{ fontSize: isMobileLandscape ? '0.5em' : '0.6em', marginTop: isMobileLandscape ? '2px' : '3px', opacity: 0.9 }}>
                      📍 {t('gps.today')}
                    </span>
                  )}
                </div>

                {accounts.map((acc) => {
                  const accountData = row.accounts[acc.nom];
                  const hasActivity = accountData.hasActivity;
                  const transfer = accountData.transfer;
                  
                  const displayValue = animatingRow[acc.nom] !== undefined 
                    ? animatingRow[acc.nom] 
                    : accountData.solde;
                  
                  const isAnimating = animatingRow[acc.nom] !== undefined && 
                    Math.abs(animatingRow[acc.nom] - accountData.solde) > 0.01;

                  const hasActiveTransfer = isTransferActive && transfer;
                  
                  const alert = creditLimitAlerts[acc.nom];
                  const isLimitExceeded = alert && alert.limite && accountData.solde >= alert.limite;
                  const isAfterLimitDate = alert && alert.limitReachedDateStr && 
                    row.dateStr > alert.limitReachedDateStr;
                  
                  const accountGoals = goalAchievements[acc.nom] || [];
                  const goalReachedHere = accountGoals.find(g => g.goalReachedDayStr === row.dateStr);
                  const isGoalAchievedBubble = !!goalReachedHere;
                  const isAfterGoalAchieved = accountGoals.some(g => 
                    g.goalReachedDayStr && row.dateStr > g.goalReachedDayStr
                  );
                  
                  let bubbleClass = '';
                  if (isAfterLimitDate) bubbleClass = 'bubble-limit-exceeded';
                  else if (isGoalAchievedBubble) bubbleClass = 'bubble-goal-achieved';
                  else if (isAfterGoalAchieved) bubbleClass = 'bubble-after-goal';
                  else if (hasActiveTransfer) bubbleClass = 'transfer-active';
                  if (hasActivity && !isAfterLimitDate && !isAfterGoalAchieved) bubbleClass += ' bubble-with-activity';

                  return (
                    <div
                      key={acc.nom}
                      className={bubbleClass}
                      onClick={(e) => {
                        if (isAfterLimitDate || isAfterGoalAchieved) {
                          e.stopPropagation();
                          return;
                        }
                        if (hasActivity || isGoalAchievedBubble) {
                          e.stopPropagation();
                          setSelectedBubble({ 
                            dateStr: row.dateStr, 
                            accountName: acc.nom,
                            accountData: accountData,
                            shortLabel: row.shortLabel,
                            goalAchieved: goalReachedHere
                          });
                        }
                      }}
                      style={{
                        flex: 1,
                        minWidth: isMobileLandscape ? '90px' : '140px',
                        minHeight: isMobileLandscape ? '50px' : '70px',
                        borderRadius: isMobileLandscape ? '12px' : '18px',
                        background: isLimitExceeded 
                          ? 'linear-gradient(135deg, rgba(243, 156, 18, 0.15), rgba(230, 126, 34, 0.1))'
                          : isGoalAchievedBubble
                            ? 'linear-gradient(135deg, rgba(46, 204, 113, 0.2), rgba(39, 174, 96, 0.1))'
                            : 'white',
                        padding: isMobileLandscape ? '6px' : '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: isLimitExceeded
                          ? '0 0 15px rgba(243, 156, 18, 0.3), 0 6px 20px rgba(0,0,0,0.15)'
                          : isGoalAchievedBubble
                            ? '0 0 20px rgba(46, 204, 113, 0.4), 0 6px 20px rgba(0,0,0,0.15)'
                            : hasActivity 
                              ? '0 6px 20px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)' 
                              : '0 4px 15px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)',
                        border: isLimitExceeded
                          ? '3px solid #f39c12'
                          : isGoalAchievedBubble
                            ? '3px solid #3498db'
                            : hasActiveTransfer 
                              ? '3px solid #f39c12'
                              : hasActivity 
                                ? '2px solid #667eea' 
                                : '2px solid #e0e0e0',
                        transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.2s',
                        position: 'relative',
                        overflow: 'visible',
                        cursor: (isAfterLimitDate || isAfterGoalAchieved) ? 'not-allowed' : ((hasActivity || isGoalAchievedBubble) ? 'pointer' : 'default')
                      }}
                    >
                      {isGoalAchievedBubble && (
                        <div className="goal-achieved-badge">
                          🎯 {goalReachedHere.goalName}
                        </div>
                      )}
                      
                      {isLimitExceeded && (
                        <div className="limit-exceeded-badge">
                          ⚠️ LIMITE
                        </div>
                      )}
                      {isActivityActive && accountData.entrees.length > 0 && (
                        <div className="entry-arrow">💸</div>
                      )}
                      
                      {isActivityActive && accountData.sorties.length > 0 && (
                        <div className="exit-arrow">💸</div>
                      )}
                      
                      {hasActiveTransfer && (
                        <>
                          <div 
                            className={`transfer-indicator ${transfer.isSource ? 'source' : 'destination'}`}
                          >
                            💸
                          </div>
                          
                          <div className={`transfer-particles ${transfer.isSource ? 'source' : 'destination'}`}>
                            {[0, 1, 2].map(i => (
                              <span 
                                key={i}
                                className={`particle ${transfer.isSource ? 'out' : 'in'}`}
                                style={{ 
                                  animationDelay: `${i * 0.2}s`,
                                  top: `${-5 + i * 8}px`
                                }}
                              >
                                💵
                              </span>
                            ))}
                          </div>
                        </>
                      )}

                      <div style={{ textAlign: 'center', marginBottom: hasActivity ? (isMobileLandscape ? '4px' : '8px') : '0' }}>
                        <span 
                          className={isAnimating ? 'solde-animating' : ''}
                          style={{
                            fontSize: isMobileLandscape ? '0.95em' : '1.3em',
                            fontWeight: 'bold',
                            color: accountData.isCredit 
                              ? (accountData.solde > 0 ? '#ffa500' : '#3498db')
                              : (accountData.solde >= 0 ? '#3498db' : '#ffa500'),
                            transition: 'color 0.3s'
                          }}
                        >
                          {formatMontant(displayValue)}
                        </span>
                      </div>

                      {hasActivity && (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          gap: '10px',
                          marginTop: 'auto'
                        }}>
                          {/* ENTRÉES */}
                          <div style={{ flex: 1, textAlign: 'left', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                            {isMobileLandscape ? (
                              // Mobile: petits cercles
                              <>
                                {accountData.entrees.slice(0, 5).map((e, i) => (
                                  <span 
                                    key={i}
                                    className="activity-badge entry"
                                    style={{
                                      display: 'inline-block',
                                      width: '10px',
                                      height: '10px',
                                      background: 'linear-gradient(135deg, #00E5FF 0%, #00BCD4 100%)',
                                      borderRadius: '50%',
                                      boxShadow: '0 2px 6px rgba(0, 229, 255, 0.5)',
                                      animationDelay: `${i * 0.1}s`
                                    }}
                                    title={`${e.description}: ${formatMontant(e.montant)}`}
                                  />
                                ))}
                                {accountData.entrees.length > 5 && (
                                  <span style={{ fontSize: '0.5em', color: '#00E5FF', fontWeight: '600' }}>
                                    +{accountData.entrees.length - 5}
                                  </span>
                                )}
                              </>
                            ) : (
                              // Desktop: badges complets avec description et montant
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {accountData.entrees.slice(0, 3).map((e, i) => (
                                  <span 
                                    key={i}
                                    className="activity-badge entry"
                                    style={{
                                      display: 'inline-flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      background: 'linear-gradient(135deg, #00E5FF 0%, #00E5FF 100%)',
                                      color: 'white',
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      fontSize: '0.65em',
                                      animationDelay: `${i * 0.15}s`,
                                      boxShadow: '0 2px 6px rgba(0, 229, 255, 0.4)'
                                    }}
                                  >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px', fontWeight: '500' }}>
                                      {e.description} {accountData.isCredit ? '↓' : '↑'}
                                    </span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                                      {formatMontant(e.montant)}
                                    </span>
                                  </span>
                                ))}
                                {accountData.entrees.length > 3 && (
                                  <div style={{ fontSize: '0.6em', color: '#00E5FF', fontWeight: '600', marginTop: '2px' }}>
                                    +{accountData.entrees.length - 3} autre{accountData.entrees.length - 3 > 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* SORTIES */}
                          <div style={{ flex: 1, textAlign: 'right', display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {isMobileLandscape ? (
                              // Mobile: petits cercles
                              <>
                                {accountData.sorties.slice(0, 5).map((s, i) => (
                                  <span 
                                    key={i}
                                    className="activity-badge exit"
                                    style={{
                                      display: 'inline-block',
                                      width: '10px',
                                      height: '10px',
                                      background: 'linear-gradient(135deg, #FF9100 0%, #E65100 100%)',
                                      borderRadius: '50%',
                                      boxShadow: '0 2px 6px rgba(255, 145, 0, 0.5)',
                                      animationDelay: `${i * 0.1}s`
                                    }}
                                    title={`${s.description}: ${formatMontant(s.montant)}`}
                                  />
                                ))}
                                {accountData.sorties.length > 5 && (
                                  <span style={{ fontSize: '0.5em', color: '#FF9100', fontWeight: '600' }}>
                                    +{accountData.sorties.length - 5}
                                  </span>
                                )}
                              </>
                            ) : (
                              // Desktop: badges complets avec description et montant
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                                {accountData.sorties.slice(0, 3).map((s, i) => (
                                  <span 
                                    key={i}
                                    className="activity-badge exit"
                                    style={{
                                      display: 'inline-flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      background: 'linear-gradient(135deg, #FF9100 0%, #FF9100 100%)',
                                      color: 'white',
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      fontSize: '0.65em',
                                      animationDelay: `${i * 0.15}s`,
                                      boxShadow: '0 2px 6px rgba(255, 145, 0, 0.4)'
                                    }}
                                  >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px', fontWeight: '500' }}>
                                      {s.description} {accountData.isCredit ? '↑' : '↓'}
                                    </span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                                      {formatMontant(s.montant)}
                                    </span>
                                  </span>
                                ))}
                                {accountData.sorties.length > 3 && (
                                  <div style={{ fontSize: '0.6em', color: '#FF9100', fontWeight: '600', marginTop: '2px', textAlign: 'right' }}>
                                    +{accountData.sorties.length - 3} autre{accountData.sorties.length - 3 > 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {viewMode === 'month' && displayMonthData.slice().reverse().map((month) => {
            const isSelected = selectedMonthKey === month.monthKey;
            const isVisible = visibleRows.has(month.monthKey);
            const isActivityActive = activeActivityRows.has(month.monthKey);
            const animatingRow = animatingAccounts[month.monthKey] || {};
            
            return (
              <div
                key={month.monthKey}
                id={`month-row-${month.monthKey}`}
                ref={el => rowRefs.current[month.monthKey] = el}
                data-month={month.monthKey}
                className={`roller-row ${isVisible ? 'visible' : ''}`}
                onClick={() => {
                  // DRILL-DOWN: Clic sur mois -> Vue JOUR de ce mois
                  setDrillDownMonthKey(month.monthKey);
                  changeViewMode('day');
                  setSelectedRowIndex(0);
                  setTimeout(scrollToBottom, 50);
                }}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'stretch',
                  background: isSelected ? 'rgba(39, 174, 96, 0.15)' : month.isCurrentMonth ? 'rgba(39, 174, 96, 0.08)' : 'transparent',
                  padding: '6px',
                  borderRadius: '18px',
                  border: isSelected ? '2px solid rgba(39, 174, 96, 0.5)' : month.isCurrentMonth ? '2px solid rgba(39, 174, 96, 0.3)' : '2px solid transparent',
                  position: 'relative',
                  opacity: isVisible ? 1 : 0.7,
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <div 
                  className="date-cell"
                  style={{
                  width: '70px',
                  minWidth: '70px',
                  borderRadius: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 5px',
                  background: month.isCurrentMonth
                    ? 'linear-gradient(180deg, #3498db 0%, #5dade2 100%)'
                    : 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
                  boxShadow: month.isCurrentMonth 
                    ? '0 4px 15px rgba(39, 174, 96, 0.4)'
                    : 'none',
                  border: month.isCurrentMonth ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
                  color: 'white'
                }}>
                  <button
                    className="edit-budget-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      openBudgetEdit(`${month.year}-${String(month.month + 1).padStart(2, '0')}-01`, month.label, 'month');
                    }}
                    title="Voir le budget de ce mois"
                    style={{ display: 'none' }}
                  >
                    E
                  </button>
                  <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
                    {monthsShort[month.month]}
                  </span>
                  <span style={{ fontSize: '0.85em', opacity: 0.9 }}>
                    {month.year}
                  </span>
                  {month.isCurrentMonth && (
                    <span style={{
                      fontSize: '0.55em',
                      background: 'rgba(255,255,255,0.3)',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      marginTop: '3px'
                    }}>
                      {i18n.language === 'fr' ? 'Actuel' : 'Current'}
                    </span>
                  )}
                </div>

                {accounts.map(acc => {
                  const accountData = month.accounts[acc.nom];
                  if (!accountData) return null;
                  
                  const hasRealActivity = accountData.totalEntrees > 0 || accountData.totalSorties > 0 || Math.abs(accountData.variation) > 0.01;
                  
                  const variationColor = accountData.isCredit
                    ? (accountData.variation > 0 ? '#ffa500' : accountData.variation < 0 ? '#3498db' : '#7f8c8d')
                    : (accountData.variation >= 0 ? '#3498db' : '#ffa500');
                  
                  const soldeColor = accountData.isCredit 
                    ? (accountData.soldeFin > 0 ? '#ffa500' : '#3498db')
                    : (accountData.soldeFin >= 0 ? '#3498db' : '#ffa500');
                  
                  const isAnimating = animatingRow[acc.nom] !== undefined;
                  const displayValue = isAnimating ? animatingRow[acc.nom] : accountData.soldeFin;
                  
                  const alert = creditLimitAlerts[acc.nom];
                  const isLimitExceeded = alert && alert.limite && accountData.soldeFin >= alert.limite;
                  const isAfterLimitDate = alert && alert.limitReachedDateStr && 
                    month.monthKey > alert.limitReachedDateStr;
                  
                  const accountGoals = goalAchievements[acc.nom] || [];
                  const goalReachedHere = accountGoals.find(g => g.goalReachedMonthKey === month.monthKey);
                  const isGoalAchievedBubble = !!goalReachedHere;
                  const isAfterGoalAchieved = accountGoals.some(g => 
                    g.goalReachedMonthKey && month.monthKey > g.goalReachedMonthKey
                  );
                  
                  let bubbleClass = '';
                  if (isAfterLimitDate) bubbleClass = 'bubble-limit-exceeded';
                  else if (isGoalAchievedBubble) bubbleClass = 'bubble-goal-achieved';
                  else if (isAfterGoalAchieved) bubbleClass = 'bubble-after-goal';
                  if (hasRealActivity && !isAfterLimitDate && !isAfterGoalAchieved) bubbleClass += ' bubble-with-activity';
                  
                  return (
                    <div
                      key={acc.nom}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAfterLimitDate || isAfterGoalAchieved) return;
                        if (hasRealActivity || isGoalAchievedBubble) {
                          setSelectedBubble({
                            dateStr: month.monthKey,
                            accountName: acc.nom,
                            accountData: {
                              ...accountData,
                              solde: accountData.soldeFin
                            },
                            shortLabel: month.label,
                            isMonthView: true,
                            goalAchieved: goalReachedHere
                          });
                        }
                      }}
                      className={bubbleClass}
                      style={{
                        flex: 1,
                        minWidth: '130px',
                        borderRadius: '15px',
                        background: isLimitExceeded
                          ? 'linear-gradient(180deg, rgba(243, 156, 18, 0.15) 0%, rgba(230, 126, 34, 0.1) 100%)'
                          : isGoalAchievedBubble
                            ? 'linear-gradient(180deg, rgba(46, 204, 113, 0.2) 0%, rgba(39, 174, 96, 0.1) 100%)'
                            : hasRealActivity 
                              ? 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)'
                              : '#f8f9fa',
                        padding: '10px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: isLimitExceeded
                          ? '0 0 12px rgba(243, 156, 18, 0.3), 0 3px 10px rgba(0,0,0,0.08)'
                          : isGoalAchievedBubble
                            ? '0 0 15px rgba(46, 204, 113, 0.4), 0 3px 12px rgba(0,0,0,0.1)'
                            : hasRealActivity 
                              ? '0 3px 12px rgba(0,0,0,0.1)' 
                              : '0 1px 4px rgba(0,0,0,0.05)',
                        border: isLimitExceeded
                          ? '3px solid #f39c12'
                          : isGoalAchievedBubble
                            ? '3px solid #3498db'
                            : hasRealActivity 
                              ? '2px solid rgba(52, 152, 219, 0.4)' 
                              : '1px solid #e0e0e0',
                        transition: 'all 0.3s',
                        cursor: (isAfterLimitDate || isAfterGoalAchieved) ? 'not-allowed' : ((hasRealActivity || isGoalAchievedBubble) ? 'pointer' : 'default'),
                        position: 'relative',
                        overflow: 'visible'
                      }}
                    >
                      {isGoalAchievedBubble && (
                        <div className="goal-achieved-badge">
                          🎯 {goalReachedHere.goalName}
                        </div>
                      )}
                      
                      {isLimitExceeded && (
                        <div className="limit-exceeded-badge">
                          ⚠️ LIMITE
                        </div>
                      )}
                      <div style={{ textAlign: 'center', marginBottom: '2px' }}>
                        <span 
                          className={isAnimating ? 'solde-animating' : ''}
                          style={{
                            fontSize: '1.25em',
                            fontWeight: 'bold',
                            color: soldeColor,
                            transition: 'color 0.3s'
                          }}
                        >
                          {formatMontant(displayValue)}
                        </span>
                      </div>
                      
                      <div style={{
                        textAlign: 'center',
                        fontSize: '0.75em',
                        color: variationColor,
                        fontWeight: '600',
                        marginBottom: hasRealActivity ? '6px' : '0'
                      }}>
                        {accountData.variation >= 0 ? '+' : ''}{formatMontant(accountData.variation)}
                      </div>
                      
                      {hasRealActivity && (
                        <div style={{
                          display: 'flex',
                          justifyContent: isMobile ? 'center' : 'space-between',
                          alignItems: isMobile ? 'center' : 'flex-start',
                          gap: isMobile ? '8px' : '4px',
                          borderTop: '1px solid #eee',
                          paddingTop: isMobile ? '4px' : '6px'
                        }}>
                          {isMobile ? (
                            /* Mobile: Dots colorés */
                            <>
                              {accountData.totalEntrees > 0 && (
                                <div style={{
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: '#00E5FF',
                                  boxShadow: '0 0 6px rgba(0, 229, 255, 0.6)'
                                }} />
                              )}
                              {accountData.totalSorties > 0 && (
                                <div style={{
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: '#FF9100',
                                  boxShadow: '0 0 6px rgba(255, 145, 0, 0.6)'
                                }} />
                              )}
                            </>
                          ) : (
                            /* Desktop: Badges complets */
                            <>
                              <div style={{ flex: 1, textAlign: 'left', position: 'relative' }}>
                                {isActivityActive && accountData.totalEntrees > 0 && (
                                  <div style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '-15px',
                                    transform: 'translateX(-50%)',
                                    animation: 'money-enter 0.8s ease-out forwards',
                                    fontSize: '0.9em',
                                    zIndex: 5
                                  }}>
                                    💸
                                  </div>
                                )}
                                <div 
                                  className={`activity-badge entry ${isActivityActive ? 'animate' : ''}`}
                                  style={{
                                    display: 'inline-block',
                                    background: 'linear-gradient(135deg, #00E5FF 0%, #00E5FF 100%)',
                                    color: 'white',
                                    padding: '3px 8px',
                                    borderRadius: '10px',
                                    fontSize: '0.7em',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 6px rgba(0, 229, 255, 0.4)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                  }}
                                >
                                  ↓ {formatMontant(accountData.totalEntrees)}
                                </div>
                                <div style={{ fontSize: '0.55em', color: '#7f8c8d', marginTop: '2px' }}>
                                  {accountData.entrees.length} trans.
                                </div>
                              </div>
                              
                              <div style={{ flex: 1, textAlign: 'right', position: 'relative' }}>
                                {isActivityActive && accountData.totalSorties > 0 && (
                                  <div style={{
                                    position: 'absolute',
                                    right: '50%',
                                    top: '-15px',
                                    transform: 'translateX(50%)',
                                    animation: 'money-exit 0.8s ease-out forwards',
                                    fontSize: '0.9em',
                                    zIndex: 5
                                  }}>
                                    💸
                                  </div>
                                )}
                                <div 
                                  className={`activity-badge exit ${isActivityActive ? 'animate' : ''}`}
                                  style={{
                                    display: 'inline-block',
                                    background: 'linear-gradient(135deg, #FF9100 0%, #FF9100 100%)',
                                    color: 'white',
                                    padding: '3px 8px',
                                    borderRadius: '10px',
                                    fontSize: '0.7em',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 6px rgba(255, 145, 0, 0.4)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                  }}
                                >
                                  ↑ {formatMontant(accountData.totalSorties)}
                                </div>
                                <div style={{ fontSize: '0.55em', color: '#7f8c8d', marginTop: '2px' }}>
                                  {accountData.sorties.length} trans.
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      
                      {!hasRealActivity && (
                        <div style={{ textAlign: 'center', color: '#bdc3c7', fontSize: '0.7em', fontStyle: 'italic' }}>
                          Aucune activité
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {viewMode === 'year' && displayYearData.slice().reverse().map((year) => {
            const isSelected = selectedYearKey === year.yearKey;
            const isVisible = visibleRows.has(year.yearKey);
            const isActivityActive = activeActivityRows.has(year.yearKey);
            const animatingRow = animatingAccounts[year.yearKey] || {};
            
            return (
              <div
                key={year.yearKey}
                id={`year-row-${year.yearKey}`}
                ref={el => rowRefs.current[year.yearKey] = el}
                data-year={year.yearKey}
                className={`roller-row ${isVisible ? 'visible' : ''}`}
                onClick={() => {
                  // DRILL-DOWN: Clic sur année -> Vue MOIS de cette année
                  const targetMonthKey = `${year.yearKey}-01`;
                  setSelectedMonthKey(targetMonthKey);
                  changeViewMode('month');
                  // Scroller vers le premier mois de l'année sélectionnée dans la zone principale ET la sidebar
                  setTimeout(() => {
                    const element = document.getElementById(`month-row-${targetMonthKey}`);
                    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Scroller aussi la sidebar vers le mois sélectionné
                    const sidebarElement = document.getElementById(`sidebar-month-${targetMonthKey}`);
                    if (sidebarElement) sidebarElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'stretch',
                  background: isSelected ? 'rgba(155, 89, 182, 0.15)' : year.isCurrentYear ? 'rgba(155, 89, 182, 0.08)' : 'transparent',
                  padding: '8px',
                  borderRadius: '20px',
                  border: isSelected ? '2px solid rgba(155, 89, 182, 0.5)' : year.isCurrentYear ? '2px solid rgba(155, 89, 182, 0.3)' : '2px solid transparent',
                  position: 'relative',
                  opacity: isVisible ? 1 : 0.7,
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <div 
                  className="date-cell"
                  style={{
                  width: '80px',
                  minWidth: '80px',
                  borderRadius: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 8px',
                  background: year.isCurrentYear
                    ? 'linear-gradient(180deg, #9b59b6 0%, #8e44ad 100%)'
                    : 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
                  boxShadow: year.isCurrentYear 
                    ? '0 4px 15px rgba(155, 89, 182, 0.4)'
                    : 'none',
                  border: year.isCurrentYear ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
                  color: 'white'
                }}>
                  <button
                    className="edit-budget-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      openBudgetEdit(`${year.year}-01-01`, `${t('gps.views.year')} ${year.year}`, 'year');
                    }}
                    title="Voir le budget de cette annee"
                    style={{ display: 'none' }}
                  >
                    E
                  </button>
                  <span style={{ fontSize: '1.5em', fontWeight: 'bold' }}>
                    {year.year}
                  </span>
                  {year.isCurrentYear && (
                    <span style={{
                      fontSize: '0.55em',
                      background: 'rgba(255,255,255,0.3)',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      marginTop: '4px'
                    }}>
                      {i18n.language === 'fr' ? 'Actuelle' : 'Current'}
                    </span>
                  )}
                </div>

                {accounts.map(acc => {
                  const accountData = year.accounts[acc.nom];
                  if (!accountData) return null;
                  
                  const hasRealActivity = accountData.totalEntrees > 0 || accountData.totalSorties > 0 || Math.abs(accountData.variation) > 0.01;
                  
                  const variationColor = accountData.isCredit
                    ? (accountData.variation > 0 ? '#ffa500' : accountData.variation < 0 ? '#3498db' : '#7f8c8d')
                    : (accountData.variation >= 0 ? '#3498db' : '#ffa500');
                  
                  const soldeColor = accountData.isCredit 
                    ? (accountData.soldeFin > 0 ? '#ffa500' : '#3498db')
                    : (accountData.soldeFin >= 0 ? '#3498db' : '#ffa500');
                  
                  const isAnimating = animatingRow[acc.nom] !== undefined;
                  const displayValue = isAnimating ? animatingRow[acc.nom] : accountData.soldeFin;
                  
                  return (
                    <div
                      key={acc.nom}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasRealActivity) {
                          setSelectedBubble({
                            dateStr: year.yearKey,
                            accountName: acc.nom,
                            accountData: {
                              ...accountData,
                              solde: accountData.soldeFin
                            },
                            shortLabel: `Année ${year.year}`,
                            isYearView: true
                          });
                        }
                      }}
                      className={hasRealActivity ? 'bubble-with-activity' : ''}
                      style={{
                        flex: 1,
                        minWidth: '140px',
                        borderRadius: '18px',
                        background: hasRealActivity 
                          ? 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)'
                          : '#f8f9fa',
                        padding: '12px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: hasRealActivity 
                          ? '0 4px 15px rgba(0,0,0,0.1)' 
                          : '0 1px 4px rgba(0,0,0,0.05)',
                        border: hasRealActivity 
                          ? '2px solid rgba(155, 89, 182, 0.4)' 
                          : '1px solid #e0e0e0',
                        transition: 'all 0.3s',
                        cursor: hasRealActivity ? 'pointer' : 'default',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ textAlign: 'center', marginBottom: '3px' }}>
                        <span 
                          className={isAnimating ? 'solde-animating' : ''}
                          style={{
                            fontSize: '1.4em',
                            fontWeight: 'bold',
                            color: soldeColor,
                            transition: 'color 0.3s'
                          }}
                        >
                          {formatMontant(displayValue)}
                        </span>
                      </div>
                      
                      <div style={{
                        textAlign: 'center',
                        fontSize: '0.8em',
                        color: variationColor,
                        fontWeight: '600',
                        marginBottom: hasRealActivity ? '8px' : '0'
                      }}>
                        {accountData.variation >= 0 ? '+' : ''}{formatMontant(accountData.variation)}
                        <span style={{ fontSize: '0.8em', opacity: 0.7, marginLeft: '3px' }}>/an</span>
                      </div>
                      
                      {hasRealActivity && (
                        <div style={{
                          display: 'flex',
                          justifyContent: isMobile ? 'center' : 'space-between',
                          alignItems: isMobile ? 'center' : 'flex-start',
                          gap: isMobile ? '8px' : '6px',
                          borderTop: '1px solid #eee',
                          paddingTop: isMobile ? '4px' : '8px'
                        }}>
                          {isMobile ? (
                            /* Mobile: Dots colorés */
                            <>
                              {accountData.totalEntrees > 0 && (
                                <div style={{
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: '#00E5FF',
                                  boxShadow: '0 0 6px rgba(0, 229, 255, 0.6)'
                                }} />
                              )}
                              {accountData.totalSorties > 0 && (
                                <div style={{
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: '#FF9100',
                                  boxShadow: '0 0 6px rgba(255, 145, 0, 0.6)'
                                }} />
                              )}
                            </>
                          ) : (
                            /* Desktop: Badges complets */
                            <>
                              <div style={{ flex: 1, textAlign: 'left', position: 'relative' }}>
                                {isActivityActive && accountData.totalEntrees > 0 && (
                                  <div style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '-15px',
                                    transform: 'translateX(-50%)',
                                    animation: 'money-enter 0.8s ease-out forwards',
                                    fontSize: '1em',
                                    zIndex: 5
                                  }}>
                                    💸
                                  </div>
                                )}
                                <div 
                                  className={`activity-badge entry ${isActivityActive ? 'animate' : ''}`}
                                  style={{
                                    display: 'inline-block',
                                    background: 'linear-gradient(135deg, #00E5FF 0%, #00E5FF 100%)',
                                    color: 'white',
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.75em',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 8px rgba(0, 229, 255, 0.4)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                  }}
                                >
                                  ↓ {formatMontant(accountData.totalEntrees)}
                                </div>
                                <div style={{ fontSize: '0.55em', color: '#7f8c8d', marginTop: '3px' }}>
                                  {accountData.entrees.length} trans.
                                </div>
                              </div>
                              
                              <div style={{ flex: 1, textAlign: 'right', position: 'relative' }}>
                                {isActivityActive && accountData.totalSorties > 0 && (
                                  <div style={{
                                    position: 'absolute',
                                    right: '50%',
                                    top: '-15px',
                                    transform: 'translateX(50%)',
                                    animation: 'money-exit 0.8s ease-out forwards',
                                    fontSize: '1em',
                                    zIndex: 5
                                  }}>
                                    💸
                                  </div>
                                )}
                                <div 
                                  className={`activity-badge exit ${isActivityActive ? 'animate' : ''}`}
                                  style={{
                                    display: 'inline-block',
                                    background: 'linear-gradient(135deg, #FF9100 0%, #FF9100 100%)',
                                    color: 'white',
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.75em',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 8px rgba(255, 145, 0, 0.4)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                  }}
                                >
                                  ↑ {formatMontant(accountData.totalSorties)}
                                </div>
                                <div style={{ fontSize: '0.55em', color: '#7f8c8d', marginTop: '3px' }}>
                                  {accountData.sorties.length} trans.
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      
                      {!hasRealActivity && (
                        <div style={{ textAlign: 'center', color: '#bdc3c7', fontSize: '0.7em', fontStyle: 'italic' }}>
                          Aucune activité
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div style={{ height: '60px', flexShrink: 0 }} />
          
          <div className="scroll-depth-bottom" />
        </div>
      </div>

      {selectedBubble && (
        <div className="modal-overlay" onClick={() => setSelectedBubble(null)}>
          <div className="bubble-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 25px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.5em' }}>
                {selectedBubble.isYearView ? '📆' : selectedBubble.isMonthView ? '📊' : '📋'}
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2em', color: '#2c3e50' }}>
                  {selectedBubble.isYearView ? t('gps.bubbleDetails.yearSummary') : selectedBubble.isMonthView ? t('gps.bubbleDetails.monthSummary') : t('gps.bubbleDetails.activityDetails')}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.85em', color: '#7f8c8d' }}>
                  {selectedBubble.accountName} • {selectedBubble.shortLabel}
                </p>
              </div>
            </div>

            <div style={{ padding: '20px 25px', maxHeight: '50vh', overflowY: 'auto', flex: 1 }}>
              <div style={{ textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.85em', color: '#7f8c8d', marginBottom: '5px' }}>
                  {selectedBubble.isYearView ? t('gps.bubbleDetails.yearEndBalance') : selectedBubble.isMonthView ? t('gps.bubbleDetails.monthEndBalance') : t('gps.bubbleDetails.dayBalance')}
                </div>
                <div style={{
                  fontSize: '2em',
                  fontWeight: 'bold',
                  color: selectedBubble.accountData?.isCredit
                    ? (selectedBubble.accountData?.solde > 0 ? '#ffa500' : '#3498db')
                    : (selectedBubble.accountData?.solde >= 0 ? '#3498db' : '#ffa500')
                }}>
                  {formatMontant(selectedBubble.accountData?.solde || 0)}
                </div>
                {(selectedBubble.isMonthView || selectedBubble.isYearView) && selectedBubble.accountData?.variation !== undefined && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '0.95em',
                    color: selectedBubble.accountData?.isCredit
                      ? (selectedBubble.accountData.variation > 0 ? '#ffa500' : '#3498db')
                      : (selectedBubble.accountData.variation >= 0 ? '#3498db' : '#ffa500')
                  }}>
                    Variation: {selectedBubble.accountData.variation >= 0 ? '+' : ''}{formatMontant(selectedBubble.accountData.variation)}
                    {selectedBubble.isYearView && <span style={{ fontSize: '0.8em', opacity: 0.7 }}> /an</span>}
                  </div>
                )}
              </div>

              {selectedBubble.accountData?.entrees?.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#00E5FF', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#00E5FF', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8em' }}>↓</span>
                    Entrées
                  </div>
                  {selectedBubble.accountData.entrees.map((e, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: 'rgba(0, 229, 255, 0.08)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                      <span style={{ fontSize: '0.95em', color: '#2c3e50' }}>{e.description}</span>
                      <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#00E5FF' }}>+{formatMontant(e.montant)}</span>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', fontSize: '0.95em', fontWeight: 'bold', color: '#00E5FF', marginTop: '8px', paddingRight: '5px' }}>
                    Total entrées: +{formatMontant(selectedBubble.accountData.totalEntrees)}
                  </div>
                </div>
              )}

              {selectedBubble.accountData?.sorties?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#FF9100', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#FF9100', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8em' }}>↑</span>
                    Sorties
                  </div>
                  {selectedBubble.accountData.sorties.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: 'rgba(255, 145, 0, 0.08)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(255, 145, 0, 0.2)' }}>
                      <span style={{ fontSize: '0.95em', color: '#2c3e50' }}>{s.description}</span>
                      <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#FF9100' }}>-{formatMontant(s.montant)}</span>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', fontSize: '0.95em', fontWeight: 'bold', color: '#FF9100', marginTop: '8px', paddingRight: '5px' }}>
                    Total sorties: -{formatMontant(selectedBubble.accountData.totalSorties)}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '15px 25px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', flexShrink: 0, background: 'white' }}>
              <button
                onClick={() => setSelectedBubble(null)}
                style={{ padding: '12px 30px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontSize: '1em', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)' }}
              >
                ✕ {t('common.close', 'Fermer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {goalNotReachablePopup && (
        <div className="modal-overlay" onClick={() => setGoalNotReachablePopup(null)}>
          <div className="bubble-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div style={{
              padding: '20px 25px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: goalNotReachablePopup.type === 'achieved' 
                ? 'linear-gradient(135deg, rgba(46, 204, 113, 0.1) 0%, rgba(39, 174, 96, 0.1) 100%)'
                : goalNotReachablePopup.type === 'wrong-direction'
                  ? 'linear-gradient(135deg, rgba(243, 156, 18, 0.1) 0%, rgba(230, 126, 34, 0.1) 100%)'
                  : goalNotReachablePopup.type === 'no-budget'
                    ? 'linear-gradient(135deg, rgba(243, 156, 18, 0.1) 0%, rgba(230, 126, 34, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(52, 152, 219, 0.1) 0%, rgba(41, 128, 185, 0.1) 100%)'
            }}>
              <span style={{ fontSize: '2em' }}>
                {goalNotReachablePopup.type === 'achieved' ? '🎉' : 
                 goalNotReachablePopup.type === 'wrong-direction' ? '⛔' :
                 goalNotReachablePopup.type === 'no-budget' ? '⚠️' : '📅'}
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2em', color: '#2c3e50' }}>
                  {goalNotReachablePopup.type === 'achieved' ? t('gps.popup.goalAchieved') : 
                   goalNotReachablePopup.type === 'wrong-direction' ? t('gps.popup.wrongDirection') :
                   goalNotReachablePopup.type === 'no-budget' ? t('gps.popup.budgetMissing') : t('gps.popup.longProjection')}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.85em', color: '#7f8c8d' }}>
                  {goalNotReachablePopup.goal.nom} • {goalNotReachablePopup.goal.compteAssocie}
                </p>
              </div>
            </div>

            <div style={{ padding: '25px' }}>
              <div style={{ textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ fontSize: '3em', marginBottom: '15px' }}>
                  {goalNotReachablePopup.type === 'achieved' ? '✅' : 
                   goalNotReachablePopup.type === 'wrong-direction' ? '🚫' :
                   goalNotReachablePopup.type === 'no-budget' ? '📋' : '🔮'}
                </div>
                <p style={{ color: '#2c3e50', fontSize: '1em', lineHeight: '1.6', margin: 0 }}>
                  {goalNotReachablePopup.message}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{
                  padding: '15px',
                  background: goalNotReachablePopup.goal.isCredit ? 'rgba(231, 76, 60, 0.08)' : 'rgba(52, 152, 219, 0.08)',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.8em', color: '#7f8c8d', marginBottom: '5px' }}>{t('gps.popup.currentBalance')}</div>
                  <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: goalNotReachablePopup.goal.isCredit ? '#ffa500' : '#3498db' }}>
                    {formatMontant(goalNotReachablePopup.goal.soldeActuel)}
                  </div>
                </div>
                <div style={{ padding: '15px', background: 'rgba(39, 174, 96, 0.08)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8em', color: '#7f8c8d', marginBottom: '5px' }}>{t('gps.popup.targetGoal')}</div>
                  <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#3498db' }}>
                    {formatMontant(goalNotReachablePopup.goal.montantCible)}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85em', color: '#7f8c8d' }}>
                  <span>{t('goals.detailsModal.progression')}</span>
                  <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>{goalNotReachablePopup.goal.progression.toFixed(1)}%</span>
                </div>
                <div style={{ height: '10px', background: '#e9ecef', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${goalNotReachablePopup.goal.progression}%`,
                    height: '100%',
                    background: goalNotReachablePopup.goal.isAchieved 
                      ? 'linear-gradient(90deg, #3498db, #5dade2)'
                      : goalNotReachablePopup.goal.isCredit
                        ? 'linear-gradient(90deg, #ffa500, #e67e22)'
                        : 'linear-gradient(90deg, #3498db, #2980b9)',
                    borderRadius: '5px',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>

              {(goalNotReachablePopup.type === 'no-budget' || goalNotReachablePopup.type === 'wrong-direction') && (
                <div style={{
                  marginTop: '20px',
                  padding: '15px',
                  background: 'rgba(243, 156, 18, 0.1)',
                  border: '1px solid rgba(243, 156, 18, 0.3)',
                  borderRadius: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f39c12', fontWeight: 'bold', marginBottom: '8px' }}>
                    <span>{goalNotReachablePopup.type === 'wrong-direction' ? '🔄' : '💡'}</span>
                    <span>{goalNotReachablePopup.type === 'wrong-direction' ? t('gps.goalPopup.recalculateRoute') : t('gps.goalPopup.suggestion')}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9em', color: '#7f8c8d', lineHeight: '1.5' }}>
                    {goalNotReachablePopup.type === 'wrong-direction' 
                      ? (goalNotReachablePopup.goal.isCredit 
                          ? t('gps.goalPopup.wrongDirectionCreditTip')
                          : t('gps.goalPopup.wrongDirectionSavingsTip'))
                      : t(goalNotReachablePopup.goal.isCredit ? 'gps.goalPopup.noBudgetCreditTip' : 'gps.goalPopup.noBudgetSavingsTip', { account: goalNotReachablePopup.goal.compteAssocie })
                    }
                  </p>
                </div>
              )}
            </div>

            <div style={{ padding: '15px 25px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {(goalNotReachablePopup.type === 'no-budget' || goalNotReachablePopup.type === 'wrong-direction') && (
                <button
                  onClick={() => { setGoalNotReachablePopup(null); setIsFullScreen(false); navigate('/budget'); }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: `2px solid ${goalNotReachablePopup.type === 'wrong-direction' ? '#ffa500' : '#f39c12'}`,
                    background: 'transparent',
                    color: goalNotReachablePopup.type === 'wrong-direction' ? '#ffa500' : '#f39c12',
                    fontSize: '0.95em',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {t('gps.goalPopup.reviewBudget')}
                </button>
              )}
              <button
                onClick={() => setGoalNotReachablePopup(null)}
                style={{
                  padding: '10px 25px',
                  borderRadius: '8px',
                  border: 'none',
                  background: goalNotReachablePopup.type === 'achieved'
                    ? 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: '0.95em',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {goalNotReachablePopup.type === 'achieved' ? t('gps.goalPopup.great') : t('gps.goalPopup.understood')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION BUDGET - RADAR (Design Capture 1) */}
      {budgetEditPopup && (() => {
        // Obtenir le budget effectif pour la date selectionnee
        const effectiveBudgetForModal = getEffectiveBudget(budgetEditPopup.dateStr);
        const segmentEntrees = effectiveBudgetForModal.entrees || [];
        const segmentSorties = effectiveBudgetForModal.sorties || [];
        
        const formatMontantModal = (montant) => {
          return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(Math.abs(montant));
        };
        
        const formatMontantShort = (montant) => {
          const abs = Math.abs(parseFloat(montant) || 0);
          if (abs >= 1000) return (abs/1000).toFixed(1) + 'k$';
          return abs.toFixed(0) + '$';
        };
        
        const calculateMonthly = (items) => {
          let total = 0;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          items.forEach(item => {
            const m = parseFloat(item.montant) || 0;
            
            // Vérifier si l'item a une date de fin passée (exclure du calcul)
            if (item.dateFinRecurrence) {
              const finDate = new Date(item.dateFinRecurrence);
              if (finDate < today) return; // Skip cet item
            }
            
            switch (item.frequence) {
              case 'quinzaine': case 'bimensuel': total += m * 2; break;
              case 'hebdomadaire': total += m * 4; break;
              case 'trimestriel': total += m / 3; break;
              case 'semestriel': total += m / 6; break;
              case 'annuel': total += m / 12; break;
              case 'uneFois': case '1-fois': break; // Fréquence "1 fois" = 0 pour le calcul mensuel
              default: total += m;
            }
          });
          return total;
        };
        
        const totalEntreesModal = calculateMonthly(segmentEntrees);
        const totalSortiesModal = calculateMonthly(segmentSorties);
        
        const allEntreesMontants = segmentEntrees.map(e => parseFloat(e.montant) || 0);
        const allSortiesMontants = segmentSorties.map(s => parseFloat(s.montant) || 0);
        
        // ============================================
        // DÉTECTION DES ITEMS LIÉS (TRANSFERTS ENTRE COMPTES)
        // ============================================
        const getBaseName = (description) => {
          if (!description) return '';
          const beforeDash = description.split('-')[0].trim().toLowerCase();
          return beforeDash;
        };
        
        const findLinkedItemsModal = (() => {
          const links = [];
          const usedEntrees = new Set();
          const usedSorties = new Set();
          
          segmentEntrees.forEach((entree, entreeIndex) => {
            if (usedEntrees.has(entreeIndex)) return;
            const entreeBaseName = getBaseName(entree.description);
            
            segmentSorties.forEach((sortie, sortieIndex) => {
              if (usedSorties.has(sortieIndex)) return;
              if (usedEntrees.has(entreeIndex)) return;
              
              const sortieBaseName = getBaseName(sortie.description);
              const sameMontant = Math.abs(parseFloat(entree.montant) - parseFloat(sortie.montant)) < 0.01;
              const sameFrequence = entree.frequence === sortie.frequence;
              const sameJour = entree.jourRecurrence === sortie.jourRecurrence;
              const differentComptes = entree.compte && sortie.compte && entree.compte !== sortie.compte;
              const sameBaseName = entreeBaseName && sortieBaseName && entreeBaseName === sortieBaseName;
              
              if (sameMontant && sameFrequence && sameJour && differentComptes && sameBaseName) {
                links.push({ entreeIndex, sortieIndex, entree, sortie });
                usedEntrees.add(entreeIndex);
                usedSorties.add(sortieIndex);
              }
            });
          });
          return links;
        })();
        
        const linkedEntreeIndexes = new Set(findLinkedItemsModal.map(l => l.entreeIndex));
        const linkedSortieIndexes = new Set(findLinkedItemsModal.map(l => l.sortieIndex));
        
        // Calculer le montant des transferts liés (pour les déduire des entrées)
        const linkedTransfersAmount = (() => {
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          
          return findLinkedItemsModal.reduce((sum, link) => {
            // Vérifier date de fin
            if (link.entree.dateFinRecurrence) {
              const finDate = new Date(link.entree.dateFinRecurrence);
              if (finDate < todayDate) return sum;
            }
            
            const montant = parseFloat(link.entree.montant) || 0;
            let mensuel = montant;
            switch (link.entree.frequence) {
              case 'quinzaine': case 'bimensuel': mensuel = montant * 2; break;
              case 'hebdomadaire': mensuel = montant * 4; break;
              case 'trimestriel': mensuel = montant / 3; break;
              case 'semestriel': mensuel = montant / 6; break;
              case 'annuel': mensuel = montant / 12; break;
              case 'uneFois': case '1-fois': mensuel = 0; break;
              default: mensuel = montant;
            }
            return sum + mensuel;
          }, 0);
        })();
        
        // Entrées: Exclure les transferts entrants (ce n'est pas un vrai revenu)
        const realTotalEntrees = totalEntreesModal - linkedTransfersAmount;
        // Sorties: INCLURE les transferts sortants (c'est une vraie sortie de fonds)
        const realTotalSorties = totalSortiesModal;
        const balanceModal = realTotalEntrees - realTotalSorties;
        
        // Items non liés (affichés dans les zones gauche/droite)
        const unlinkedEntrees = segmentEntrees.filter((_, i) => !linkedEntreeIndexes.has(i));
        const unlinkedSorties = segmentSorties.filter((_, i) => !linkedSortieIndexes.has(i));
        const unlinkedEntreesIndexes = segmentEntrees.map((_, i) => i).filter(i => !linkedEntreeIndexes.has(i));
        const unlinkedSortiesIndexes = segmentSorties.map((_, i) => i).filter(i => !linkedSortieIndexes.has(i));
        
        const getBubbleSize = (montant, allMontants, isEntree) => {
          if (allMontants.length === 0) return isEntree ? 90 : 78;
          const min = Math.min(...allMontants);
          const max = Math.max(...allMontants);
          const range = max - min || 1;
          const normalized = (montant - min) / range;
          return isEntree ? 85 + normalized * 25 : 75 + normalized * 25;
        };
        
        const calculateGridPosition = (index, total) => {
          const cols = Math.ceil(Math.sqrt(total));
          const rows = Math.ceil(total / cols);
          const col = index % cols;
          const row = Math.floor(index / cols);
          const padding = 8;
          const cellWidth = (100 - padding * 2) / cols;
          const cellHeight = (100 - padding * 2) / rows;
          return {
            xPercent: padding + (col + 0.5) * cellWidth,
            yPercent: padding + (row + 0.5) * cellHeight
          };
        };

        return (
          <div onClick={() => { setBudgetEditPopup(null); setExpandedModalSection(null); }} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: isMobile ? '10px' : '20px'
          }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              background: 'white', borderRadius: isMobile ? '15px' : '20px',
              width: '95%', maxWidth: '900px', height: isMobile ? '75vh' : '85vh',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.4)'
            }}>
              {/* Header bleu foncé */}
              <div style={{
                padding: isMobile ? '6px 12px' : '16px 25px',
                background: 'linear-gradient(135deg, #040449 0%, #100261 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '12px' }}>
                  <span style={{ fontSize: isMobile ? '1em' : '1.5em', color: 'white' }}>📅</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: isMobile ? '0.8em' : '1.1em', color: 'white' }}>
                      {t('gps.budgetModal.title')} {budgetEditPopup.dateLabel}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8em', color: 'rgba(255,255,255,0.7)', display: isMobile ? 'none' : 'block' }}>
                      {t('gps.budgetModal.subtitle')}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setBudgetEditPopup(null); setExpandedModalSection(null); }} style={{
                  background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                  width: isMobile ? '26px' : '36px', height: isMobile ? '26px' : '36px', borderRadius: '50%',
                  cursor: 'pointer', fontSize: isMobile ? '0.9em' : '1.4em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>x</button>
              </div>
              
              {/* Plateforme Radar */}
              <div style={{
                position: 'relative', flex: 1,
                background: 'white',
                overflow: 'hidden'
              }}>
                {/* Cercle exterieur - caché sur mobile */}
                {!isMobile && (
                  <div style={{
                    position: 'absolute', left: '50%', top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '420px', height: '420px', borderRadius: '50%',
                    border: '2px solid rgba(4, 4, 73, 0.15)', pointerEvents: 'none'
                  }} />
                )}
                {/* Cercle interieur */}
                <div style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: isMobile ? '200px' : '350px', height: isMobile ? '200px' : '350px', borderRadius: '50%',
                  border: isMobile ? '2px solid rgba(4, 4, 73, 0.2)' : '3px solid rgba(4, 4, 73, 0.25)', pointerEvents: 'none'
                }} />
                
                {/* Centre - Balance */}
                <div style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center', zIndex: 20
                }}>
                  <p style={{ color: '#7f8c8d', fontSize: isMobile ? '0.7em' : '0.85em', margin: '0 0 3px', fontWeight: '600' }}>
                    {t('gps.budgetModal.monthlyBalance')}
                  </p>
                  <p style={{
                    fontSize: isMobile ? '1.4em' : '2em', fontWeight: 'bold', margin: isMobile ? '0 0 5px' : '0 0 10px',
                    color: balanceModal >= 0 ? '#00E5FF' : '#FF9100',
                    textShadow: '0 2px 10px rgba(0,0,0,0.1)'
                  }}>
                    {balanceModal >= 0 ? '+' : ''}{formatMontantModal(balanceModal)}
                  </p>
                  <div style={{ display: 'flex', gap: isMobile ? '10px' : '20px', justifyContent: 'center', fontSize: isMobile ? '0.65em' : '0.8em' }}>
                    <span style={{ color: '#00E5FF' }}>+ {formatMontantModal(realTotalEntrees)}</span>
                    <span style={{ color: '#FF9100' }}>- {formatMontantModal(realTotalSorties)}</span>
                  </div>
                </div>

                {/* ============================================ */}
                {/* TRANSFERTS LIÉS - CACHÉ */}
                {/* ============================================ */}
                {false && findLinkedItemsModal.length > 0 && (
                  <div
                    onMouseEnter={() => setExpandedModalSection('linked')}
                    onMouseLeave={() => setExpandedModalSection(null)}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: expandedModalSection === 'linked' ? 100 : 30,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'flex-start',
                      gap: '15px',
                      flexWrap: 'wrap',
                      padding: expandedModalSection === 'linked' ? '15px' : '5px',
                      background: expandedModalSection === 'linked' ? 'rgba(255,255,255,0.98)' : 'transparent',
                      borderRadius: '20px',
                      boxShadow: expandedModalSection === 'linked' ? '0 8px 30px rgba(0,0,0,0.15)' : 'none',
                      maxWidth: '80%',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {/* Vue compacte - Bulle résumée */}
                    {expandedModalSection !== 'linked' && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        background: 'white',
                        borderRadius: '50px',
                        padding: '8px 16px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)',
                          border: '3px solid white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 15px rgba(39, 174, 96, 0.4)',
                          zIndex: 2
                        }}>
                          <span style={{ color: 'white', fontSize: '1.1em' }}>🔄</span>
                        </div>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                          border: '3px solid white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: '-12px',
                          boxShadow: '0 4px 15px rgba(231, 76, 60, 0.4)',
                          zIndex: 1
                        }} />
                        <span style={{ marginLeft: '10px', fontWeight: '600', color: '#2c3e50', fontSize: '0.85em' }}>
                          {t('budget.transfers', 'Transferts')} ({findLinkedItemsModal.length})
                        </span>
                      </div>
                    )}
                    
                    {/* Vue étendue - Toutes les bulles liées */}
                    {expandedModalSection === 'linked' && findLinkedItemsModal.map((link, linkIdx) => (
                      <div
                        key={'link-' + linkIdx}
                        onClick={() => {
                          setEditDescription(link.entree.description || '');
                          setEditMontant(String(link.entree.montant || ''));
                          setEditFrequence(link.entree.frequence || 'mensuel');
                          setEditJourRecurrence(link.entree.jourRecurrence || 1);
                          setEditJourSemaine(link.entree.jourSemaine || '');
                          setEditMoisRecurrence(link.entree.moisRecurrence || '');
                          setEditDateReference(link.entree.dateReference || '');
                          setEditCompte(link.entree.compte || '');
                          setEditingBudgetItem({ ...link.entree, type: 'entree', index: link.entreeIndex, linkedItem: { ...link.sortie, index: link.sortieIndex } });
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'white',
                          borderRadius: '12px',
                          padding: '10px 15px',
                          boxShadow: '0 3px 15px rgba(0,0,0,0.1)',
                          cursor: 'pointer',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          border: '2px solid #667eea'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 3px 15px rgba(0,0,0,0.1)';
                        }}
                      >
                        <span style={{ fontSize: '1.2em' }}>🔄</span>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ margin: 0, fontWeight: '600', fontSize: '0.85em', color: '#2c3e50' }}>
                            {link.entree.description.split('-')[0].trim()}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: '0.75em', color: '#7f8c8d' }}>
                            {link.sortie.compte} → {link.entree.compte}
                          </p>
                          <p style={{ margin: '2px 0 0', fontWeight: 'bold', fontSize: '0.9em', color: '#667eea' }}>
                            {formatMontantShort(link.entree.montant)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ============================================ */}
                {/* BULLES ENTRÉES - GAUCHE */}
                {/* ============================================ */}
                <div
                  onMouseEnter={() => setExpandedModalSection('entrees')}
                  onMouseLeave={() => setExpandedModalSection(null)}
                  style={{
                    position: 'absolute',
                    top: findLinkedItemsModal.length > 0 ? '15%' : '10%',
                    bottom: '15%',
                    left: '3%',
                    width: expandedModalSection === 'entrees' ? '35%' : '28%',
                    zIndex: expandedModalSection === 'entrees' ? 60 : 5,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {/* Titre avec bouton + */}
                  <div style={{ textAlign: 'center', marginBottom: isMobile ? '0px' : '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    {!isMobile && (
                      <span style={{ color: '#3498db', fontWeight: 'bold', fontSize: '0.9em' }}>
                        {t('gps.budgetModal.entries')} ({unlinkedEntrees.length})
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditDescription('');
                        setEditMontant('');
                        setEditFrequence('mensuel');
                        setEditJourRecurrence(1);
                        setEditJourSemaine('');
                        setEditMoisRecurrence('');
                        setEditDateReference('');
                        setEditCompte('');
                        setEditingBudgetItem({ type: 'entree', index: -1, isNew: true });
                      }}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: '2px solid #3498db',
                        background: 'white',
                        color: '#3498db',
                        fontSize: '1.2em',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(39, 174, 96, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#3498db';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.color = '#3498db';
                      }}
                      title={t('gps.budgetModal.addEntry')}
                    >
                      +
                    </button>
                  </div>
                  
                  {/* Zone des bulles */}
                  <div style={{ position: 'relative', height: isMobile ? '100%' : 'calc(100% - 30px)' }}>
                    {/* Vue compacte - Bulle résumée */}
                    {expandedModalSection !== 'entrees' && unlinkedEntrees.length > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: isMobile ? '45px' : '100px',
                          height: isMobile ? '45px' : '100px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)',
                          border: isMobile ? '3px solid white' : '4px solid white',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 8px 30px rgba(39, 174, 96, 0.4)',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ fontSize: isMobile ? '0.85em' : '1.4em', fontWeight: 'bold', color: 'white' }}>
                          {unlinkedEntrees.length}
                        </span>
                        <span style={{ fontSize: isMobile ? '0.45em' : '0.7em', color: 'rgba(255,255,255,0.9)' }}>
                          {formatMontantShort(unlinkedEntrees.reduce((sum, e) => sum + (parseFloat(e.montant) || 0), 0))}
                        </span>
                      </div>
                    )}
                    
                    {/* Vue étendue - Toutes les bulles */}
                    {expandedModalSection === 'entrees' && unlinkedEntrees.map((item, displayIndex) => {
                      const originalIndex = unlinkedEntreesIndexes[displayIndex];
                      const pos = calculateGridPosition(displayIndex, unlinkedEntrees.length);
                      const size = getBubbleSize(parseFloat(item.montant) || 0, allEntreesMontants, true);
                      return (
                        <div
                          key={'entree-' + originalIndex}
                          onClick={() => {
                            setEditDescription(item.description || '');
                            setEditMontant(String(item.montant || ''));
                            setEditFrequence(item.frequence || 'mensuel');
                            setEditJourRecurrence(item.jourRecurrence || 1);
                            setEditJourSemaine(item.jourSemaine || '');
                            setEditMoisRecurrence(item.moisRecurrence || '');
                            setEditDateReference(item.dateReference || '');
                            setEditDateDepart(item.dateDepart || '');
                            setEditDateFinRecurrence(item.dateFinRecurrence || '');
                            setEditCompte(item.compte || '');
                            setEditingBudgetItem({ ...item, type: 'entree', index: originalIndex });
                          }}
                          style={{
                            position: 'absolute',
                            left: pos.xPercent + '%',
                            top: pos.yPercent + '%',
                            transform: 'translate(-50%, -50%)',
                            width: size + 'px',
                            height: size + 'px',
                            borderRadius: '50%',
                            background: 'white',
                            border: '3px solid #3498db',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(39, 174, 96, 0.2)',
                            padding: '5px',
                            boxSizing: 'border-box',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(39, 174, 96, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.2)';
                          }}
                        >
                          <span style={{
                            fontSize: '0.7em',
                            fontWeight: '600',
                            color: '#2c3e50',
                            textAlign: 'center',
                            lineHeight: 1.1,
                            maxWidth: '90%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>{item.description}</span>
                          <span style={{ fontSize: '0.75em', fontWeight: 'bold', color: '#3498db', marginTop: '2px' }}>
                            +{formatMontantShort(item.montant)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* ============================================ */}
                {/* BULLES SORTIES - DROITE */}
                {/* ============================================ */}
                <div
                  onMouseEnter={() => setExpandedModalSection('sorties')}
                  onMouseLeave={() => setExpandedModalSection(null)}
                  style={{
                    position: 'absolute',
                    top: findLinkedItemsModal.length > 0 ? '15%' : '10%',
                    bottom: '15%',
                    right: '3%',
                    width: expandedModalSection === 'sorties' ? '35%' : '28%',
                    zIndex: expandedModalSection === 'sorties' ? 60 : 5,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {/* Titre avec bouton - */}
                  <div style={{ textAlign: 'center', marginBottom: isMobile ? '0px' : '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    {!isMobile && (
                      <span style={{ color: '#FF9100', fontWeight: 'bold', fontSize: '0.9em' }}>
                        {t('gps.budgetModal.expenses')} ({unlinkedSorties.length})
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditDescription('');
                        setEditMontant('');
                        setEditFrequence('mensuel');
                        setEditJourRecurrence(1);
                        setEditJourSemaine('');
                        setEditMoisRecurrence('');
                        setEditDateReference('');
                        setEditCompte('');
                        setEditingBudgetItem({ type: 'sortie', index: -1, isNew: true });
                      }}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: '2px solid #FF9100',
                        background: 'white',
                        color: '#FF9100',
                        fontSize: '1.2em',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(255, 145, 0, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#FF9100';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.color = '#FF9100';
                      }}
                      title={t('gps.budgetModal.addExpense')}
                    >
                      −
                    </button>
                  </div>
                  
                  {/* Zone des bulles */}
                  <div style={{ position: 'relative', height: isMobile ? '100%' : 'calc(100% - 30px)' }}>
                    {/* Vue compacte - Bulle résumée */}
                    {expandedModalSection !== 'sorties' && unlinkedSorties.length > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: isMobile ? '45px' : '100px',
                          height: isMobile ? '45px' : '100px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #FF9100 0%, #E65100 100%)',
                          border: isMobile ? '3px solid white' : '4px solid white',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 8px 30px rgba(255, 145, 0, 0.4)',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ fontSize: isMobile ? '0.85em' : '1.4em', fontWeight: 'bold', color: 'white' }}>
                          {unlinkedSorties.length}
                        </span>
                        <span style={{ fontSize: isMobile ? '0.45em' : '0.7em', color: 'rgba(255,255,255,0.9)' }}>
                          {formatMontantShort(unlinkedSorties.reduce((sum, s) => sum + (parseFloat(s.montant) || 0), 0))}
                        </span>
                      </div>
                    )}
                    
                    {/* Vue étendue - Toutes les bulles */}
                    {expandedModalSection === 'sorties' && unlinkedSorties.map((item, displayIndex) => {
                      const originalIndex = unlinkedSortiesIndexes[displayIndex];
                      const pos = calculateGridPosition(displayIndex, unlinkedSorties.length);
                      const size = getBubbleSize(parseFloat(item.montant) || 0, allSortiesMontants, false);
                      return (
                        <div
                          key={'sortie-' + originalIndex}
                          onClick={() => {
                            setEditDescription(item.description || '');
                            setEditMontant(String(item.montant || ''));
                            setEditFrequence(item.frequence || 'mensuel');
                            setEditJourRecurrence(item.jourRecurrence || 1);
                            setEditJourSemaine(item.jourSemaine || '');
                            setEditMoisRecurrence(item.moisRecurrence || '');
                            setEditDateReference(item.dateReference || '');
                            setEditDateDepart(item.dateDepart || '');
                            setEditDateFinRecurrence(item.dateFinRecurrence || '');
                            setEditCompte(item.compte || '');
                            setEditingBudgetItem({ ...item, type: 'sortie', index: originalIndex });
                          }}
                          style={{
                            position: 'absolute',
                            left: pos.xPercent + '%',
                            top: pos.yPercent + '%',
                            transform: 'translate(-50%, -50%)',
                            width: size + 'px',
                            height: size + 'px',
                            borderRadius: '50%',
                            background: 'white',
                            border: '3px solid #FF9100',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(255, 145, 0, 0.2)',
                            padding: '5px',
                            boxSizing: 'border-box',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 145, 0, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 145, 0, 0.2)';
                          }}
                        >
                          <span style={{
                            fontSize: '0.7em',
                            fontWeight: '600',
                            color: '#2c3e50',
                            textAlign: 'center',
                            lineHeight: 1.1,
                            maxWidth: '90%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>{item.description}</span>
                          <span style={{ fontSize: '0.75em', fontWeight: 'bold', color: '#FF9100', marginTop: '2px' }}>
                            -{formatMontantShort(item.montant)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div style={{
                padding: isMobile ? '8px 15px' : '15px 25px', borderTop: '1px solid #eee',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexShrink: 0, background: 'white'
              }}>
                <p style={{ margin: 0, fontSize: isMobile ? '0.7em' : '0.85em', color: '#7f8c8d', display: isMobile ? 'none' : 'block' }}>
                  {t('gps.budgetModal.clickToEdit')}
                </p>
                <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
                  <button onClick={() => { setBudgetEditPopup(null); setExpandedModalSection(null); }} style={{
                    padding: isMobile ? '8px 16px' : '10px 20px', borderRadius: '8px',
                    border: '2px solid #040449', background: 'transparent',
                    color: '#040449', fontSize: isMobile ? '0.85em' : '0.95em', fontWeight: '600', cursor: 'pointer',
                    flex: isMobile ? 1 : 'none'
                  }}>{t('common.close')}</button>
                  <button onClick={() => {
                    // Fermer le modal
                    setBudgetEditPopup(null);
                    setExpandedModalSection(null);
                    // Déclencher l'animation de recalcul GPS
                    triggerRecalculation(() => {
                      // Animation terminée - les données sont déjà sauvegardées
                      console.log('Recalcul GPS terminé');
                    });
                  }} style={{
                    padding: isMobile ? '8px 16px' : '10px 20px', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg, #040449 0%, #100261 100%)',
                    color: 'white', fontSize: isMobile ? '0.85em' : '0.95em', fontWeight: '600', cursor: 'pointer',
                    flex: isMobile ? 1 : 'none'
                  }}>{t('common.save')}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* POPUP EDITION ITEM BUDGET */}
      {editingBudgetItem && (
        <div 
          onClick={() => setEditingBudgetItem(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: isMobile ? '10px' : '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: isMobile ? '15px' : '20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              padding: isMobile ? '15px' : '25px',
              width: '95%',
              maxWidth: '500px',
              maxHeight: isMobile ? '85vh' : '90vh',
              overflow: 'auto'
            }}
          >
            <h3 style={{ 
              margin: isMobile ? '0 0 12px' : '0 0 20px', 
              color: editingBudgetItem.type === 'entree' ? '#3498db' : '#FF9100',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: isMobile ? '1em' : '1.2em'
            }}>
              <span>{editingBudgetItem.type === 'entree' ? '🔧' : '🔧'}</span>
              {editingBudgetItem.isNew 
                ? (editingBudgetItem.type === 'entree' ? t('gps.budgetForm.addEntry') : t('gps.budgetForm.addExpense'))
                : (editingBudgetItem.type === 'entree' ? t('gps.budgetForm.editEntry') : t('gps.budgetForm.editExpense'))
              }
            </h3>
            
            {/* Description */}
            <div style={{ marginBottom: isMobile ? '10px' : '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: isMobile ? '0.85em' : '1em' }}>
                {t('gps.budgetForm.description')} <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: isMobile ? '10px' : '12px',
                  borderRadius: '10px',
                  border: '2px solid #e0e0e0',
                  fontSize: isMobile ? '0.9em' : '1em',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            {/* Montant et Frequence sur la meme ligne */}
            <div style={{ display: 'flex', gap: isMobile ? '10px' : '15px', marginBottom: isMobile ? '10px' : '15px', flexDirection: isMobile ? 'column' : 'row' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: isMobile ? '0.85em' : '1em' }}>
                  {t('gps.budgetForm.amount')} <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <input
                  type="number"
                  value={editMontant}
                  onChange={(e) => setEditMontant(e.target.value)}
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: isMobile ? '10px' : '12px',
                    borderRadius: '10px',
                    border: '2px solid #e0e0e0',
                    fontSize: isMobile ? '0.9em' : '1em',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: isMobile ? '0.85em' : '1em' }}>{t('gps.budgetForm.frequency')}</label>
                <select
                  value={editFrequence}
                  onChange={(e) => {
                    setEditFrequence(e.target.value);
                    // Réinitialiser les champs conditionnels quand la fréquence change
                    setEditJourSemaine('');
                    setEditMoisRecurrence('');
                    setEditDateReference('');
                  }}
                  style={{
                    width: '100%',
                    padding: isMobile ? '10px' : '12px',
                    borderRadius: '10px',
                    border: '2px solid #e0e0e0',
                    fontSize: isMobile ? '0.9em' : '1em',
                    boxSizing: 'border-box',
                    background: 'white'
                  }}
                >
                  {frequenceOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Champs conditionnels selon la fréquence */}
            {editFrequence === 'bimensuel' ? (
              // Bi-hebdomadaire: Jour de semaine + Date de référence
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    {t('budget.dayOfWeek')}
                  </label>
                  <select
                    value={editJourSemaine}
                    onChange={(e) => setEditJourSemaine(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '2px solid #e0e0e0',
                      fontSize: '1em',
                      boxSizing: 'border-box',
                      background: 'white'
                    }}
                  >
                    <option value="">{t('common.select')}</option>
                    {joursSemaine.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    {t('budget.lastDate')}
                  </label>
                  <select
                    value={editDateReference}
                    onChange={(e) => setEditDateReference(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '2px solid #e0e0e0',
                      fontSize: '1em',
                      boxSizing: 'border-box',
                      background: 'white'
                    }}
                  >
                    <option value="">{t('common.select')}</option>
                    {getLast15Days().map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>
            ) : editFrequence === 'hebdomadaire' ? (
              // Hebdomadaire: Jour de semaine seulement
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  {t('budget.dayOfWeek')}
                </label>
                <select
                  value={editJourSemaine}
                  onChange={(e) => setEditJourSemaine(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid #e0e0e0',
                    fontSize: '1em',
                    boxSizing: 'border-box',
                    background: 'white'
                  }}
                >
                  <option value="">{t('common.select')}</option>
                  {joursSemaine.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
                </select>
              </div>
            ) : editFrequence === 'annuel' ? (
              // Annuel: Mois + Jour du mois
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    {t('budget.month')}
                  </label>
                  <select
                    value={editMoisRecurrence}
                    onChange={(e) => setEditMoisRecurrence(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '2px solid #e0e0e0',
                      fontSize: '1em',
                      boxSizing: 'border-box',
                      background: 'white'
                    }}
                  >
                    <option value="">{t('common.select')}</option>
                    {moisOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    {t('budget.dayOfMonth')} (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editJourRecurrence}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setEditJourRecurrence('');
                      } else {
                        const num = parseInt(val);
                        if (!isNaN(num) && num >= 1 && num <= 31) {
                          setEditJourRecurrence(num);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (editJourRecurrence === '' || editJourRecurrence < 1) {
                        setEditJourRecurrence(1);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '2px solid #e0e0e0',
                      fontSize: '1em',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            ) : (editFrequence === 'trimestriel' || editFrequence === 'semestriel') ? (
              // Trimestriel/Semestriel: Date de départ + Date de fin optionnelle
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    {t('budget.startDate')}
                  </label>
                  <input
                    type="date"
                    value={editDateDepart}
                    min={getMinDateDepart()}
                    onChange={(e) => setEditDateDepart(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '2px solid #e0e0e0',
                      fontSize: '1em',
                      boxSizing: 'border-box'
                    }}
                  />
                  <p style={{ margin: '6px 0 0', fontSize: '0.8em', color: '#7f8c8d', fontStyle: 'italic' }}>
                    {editFrequence === 'trimestriel' ? t('budget.quarterlyHint') : t('budget.biannualHint')}
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    {t('budget.endDate')} <span style={{ fontWeight: '400', color: '#95a5a6' }}>({t('common.optional')})</span>
                  </label>
                  <input
                    type="date"
                    value={editDateFinRecurrence}
                    min={editDateDepart || getMinDateDepart()}
                    onChange={(e) => setEditDateFinRecurrence(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '2px solid #e0e0e0',
                      fontSize: '1em',
                      boxSizing: 'border-box'
                    }}
                  />
                  <p style={{ margin: '6px 0 0', fontSize: '0.8em', color: '#7f8c8d', fontStyle: 'italic' }}>
                    {t('budget.endDateHint')}
                  </p>
                </div>
              </div>
            ) : editFrequence === 'uneFois' ? (
              // Une fois: Date unique
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  {t('budget.transactionDate')}
                </label>
                <input
                  type="date"
                  value={editDateDepart}
                  onChange={(e) => setEditDateDepart(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid #e0e0e0',
                    fontSize: '1em',
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{ margin: '6px 0 0', fontSize: '0.8em', color: '#7f8c8d', fontStyle: 'italic' }}>
                  {t('budget.oneTimeHint')}
                </p>
              </div>
            ) : (
              // Mensuel, Semi-mensuel: Jour du mois seulement
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  {t('budget.dayOfMonth')} (1-31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={editJourRecurrence}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setEditJourRecurrence('');
                    } else {
                      const num = parseInt(val);
                      if (!isNaN(num) && num >= 1 && num <= 31) {
                        setEditJourRecurrence(num);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    if (editJourRecurrence === '' || editJourRecurrence < 1) {
                      setEditJourRecurrence(1);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid #e0e0e0',
                    fontSize: '1em',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}
            
            {/* Compte associe */}
            <div style={{ marginBottom: isMobile ? '15px' : '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: isMobile ? '0.85em' : '1em' }}>
                {t('gps.budgetForm.linkedAccount')}
              </label>
              <select
                value={editCompte}
                onChange={(e) => setEditCompte(e.target.value)}
                style={{
                  width: '100%',
                  padding: isMobile ? '10px' : '12px',
                  borderRadius: '10px',
                  border: '2px solid #e0e0e0',
                  fontSize: isMobile ? '0.9em' : '1em',
                  boxSizing: 'border-box',
                  background: 'white'
                }}
              >
                <option value="">{t('gps.budgetForm.selectAccount')}</option>
                {accounts.map((acc, idx) => (
                  <option key={idx} value={acc.nom}>{acc.nom}</option>
                ))}
              </select>
            </div>
            
            {/* Boutons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              <button
                type="button"
                onClick={() => setEditingBudgetItem(null)}
                style={{
                  flex: isMobile ? '1 1 45%' : 1,
                  padding: isMobile ? '10px' : '12px',
                  borderRadius: '10px',
                  border: '2px solid #e0e0e0',
                  background: 'white',
                  color: '#7f8c8d',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.9em' : '1em'
                }}
              >
                {t('gps.budgetForm.cancel')}
              </button>
              
              {/* Bouton Supprimer - seulement pour les items existants */}
              {!editingBudgetItem.isNew && (
                <button
                  type="button"
                  onClick={() => {
                    // Ouvrir le popup de confirmation de suppression
                    setConfirmDeletePopup({
                      itemDescription: editDescription,
                      itemMontant: editMontant,
                      itemType: editingBudgetItem.type,
                      itemIndex: editingBudgetItem.index,
                      dateStr: budgetEditPopup.dateStr,
                      dateLabel: budgetEditPopup.dateLabel,
                      linkedItem: editingBudgetItem.linkedItem || null
                    });
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '2px solid #e74c3c',
                    background: 'white',
                    color: '#e74c3c',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e74c3c';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#e74c3c';
                  }}
                >
                  🗑️ {t('gps.budgetForm.delete')}
                </button>
              )}
              
              <button
                type="button"
                onClick={() => {
                  // Ouvrir le popup de confirmation stylé
                  setConfirmSavePopup({
                    dateStr: budgetEditPopup.dateStr,
                    dateLabel: budgetEditPopup.dateLabel,
                    itemDescription: editDescription,
                    itemMontant: editMontant,
                    itemType: editingBudgetItem.type,
                    isNew: editingBudgetItem.isNew,
                    linkedItem: editingBudgetItem.linkedItem || null
                  });
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: editingBudgetItem.type === 'entree' 
                    ? 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)'
                    : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {editingBudgetItem.isNew ? t('gps.budgetForm.add') : t('gps.budgetForm.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de confirmation de SUPPRESSION */}
      {confirmDeletePopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '0',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
            animation: 'bounceIn 0.3s ease',
            overflow: 'hidden'
          }}>
            {/* Header rouge */}
            <div style={{
              background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
              padding: '25px 30px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.8em' }}>🗑️</span>
                <h3 style={{ margin: 0, fontSize: '1.3em', fontWeight: 'bold' }}>
                  Confirmer la suppression
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.9em', opacity: 0.9 }}>
                Cette action est irréversible
              </p>
            </div>

            {/* Contenu */}
            <div style={{ padding: '25px 30px' }}>
              {/* Résumé de l'item à supprimer */}
              <div style={{
                background: 'rgba(231, 76, 60, 0.1)',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '20px',
                border: '2px solid #e74c3c'
              }}>
                <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: '#2c3e50' }}>
                  {confirmDeletePopup.itemDescription}
                </p>
                <p style={{
                  margin: 0,
                  fontSize: '1.4em',
                  fontWeight: 'bold',
                  color: confirmDeletePopup.itemType === 'entree' ? '#3498db' : '#e74c3c'
                }}>
                  {confirmDeletePopup.itemType === 'entree' ? '+' : '-'}
                  {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(parseFloat(confirmDeletePopup.itemMontant) || 0)}
                </p>
              </div>

              {/* Message d'avertissement */}
              <div style={{
                background: '#fff3cd',
                borderRadius: '10px',
                padding: '15px',
                marginBottom: '20px',
                border: '1px solid #ffc107'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '1.2em' }}>⚠️</span>
                  <div style={{ fontSize: '0.85em', color: '#856404', lineHeight: 1.5 }}>
                    <p style={{ margin: 0 }}>
                      Voulez-vous vraiment supprimer cette {confirmDeletePopup.itemType === 'entree' ? 'entrée' : 'sortie'} du budget?
                    </p>
                    {confirmDeletePopup.linkedItem && (
                      <p style={{ margin: '8px 0 0', fontWeight: 'bold' }}>
                        🔄 Le transfert lié ({confirmDeletePopup.linkedItem.compte}) sera également supprimé.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Boutons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setConfirmDeletePopup(null)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: '2px solid #bdc3c7',
                    background: 'white',
                    color: '#7f8c8d',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.95em',
                    transition: 'all 0.2s'
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Exécuter la suppression
                    const itemType = confirmDeletePopup.itemType;
                    const itemIndex = confirmDeletePopup.itemIndex;
                    const dateStr = confirmDeletePopup.dateStr;
                    const linkedItem = confirmDeletePopup.linkedItem;
                    
                    // Créer une copie du budget actuel
                    const effectiveBudgetForDelete = getEffectiveBudget(dateStr);
                    let newEntrees = [...(effectiveBudgetForDelete.entrees || [])];
                    let newSorties = [...(effectiveBudgetForDelete.sorties || [])];
                    
                    // Supprimer l'item principal
                    if (itemType === 'entree') {
                      newEntrees.splice(itemIndex, 1);
                      // Si item lié, supprimer aussi la sortie liée
                      if (linkedItem && linkedItem.index !== undefined) {
                        // Ajuster l'index si nécessaire (si l'entrée supprimée affecte l'index)
                        newSorties.splice(linkedItem.index, 1);
                      }
                    } else {
                      newSorties.splice(itemIndex, 1);
                      // Si item lié, supprimer aussi l'entrée liée
                      if (linkedItem && linkedItem.index !== undefined) {
                        newEntrees.splice(linkedItem.index, 1);
                      }
                    }
                    
                    // Créer la nouvelle modification de budget
                    const newModification = {
                      dateEffet: dateStr,
                      entrees: newEntrees,
                      sorties: newSorties,
                      createdAt: new Date().toISOString()
                    };
                    
                    // Sauvegarder dans userData
                    const newUserData = JSON.parse(JSON.stringify(userData));
                    if (!newUserData.budgetPlanning.modifications) {
                      newUserData.budgetPlanning.modifications = [];
                    }
                    
                    // ============================================
                    // PROPAGATION DES SUPPRESSIONS AUX MODIFICATIONS ULTÉRIEURES
                    // ============================================
                    const deletedItems = [];
                    
                    // Récupérer les items supprimés
                    if (itemType === 'entree') {
                      const deletedEntree = effectiveBudgetForDelete.entrees[itemIndex];
                      if (deletedEntree) {
                        deletedItems.push({ item: deletedEntree, type: 'entree' });
                      }
                      if (linkedItem && linkedItem.index !== undefined) {
                        const deletedSortie = effectiveBudgetForDelete.sorties[linkedItem.index];
                        if (deletedSortie) {
                          deletedItems.push({ item: deletedSortie, type: 'sortie' });
                        }
                      }
                    } else {
                      const deletedSortie = effectiveBudgetForDelete.sorties[itemIndex];
                      if (deletedSortie) {
                        deletedItems.push({ item: deletedSortie, type: 'sortie' });
                      }
                      if (linkedItem && linkedItem.index !== undefined) {
                        const deletedEntree = effectiveBudgetForDelete.entrees[linkedItem.index];
                        if (deletedEntree) {
                          deletedItems.push({ item: deletedEntree, type: 'entree' });
                        }
                      }
                    }
                    
                    // Fonction pour trouver un item correspondant
                    const findMatchingItemIndex = (items, targetItem) => {
                      return items.findIndex(item => 
                        item.description === targetItem.description && 
                        item.compte === targetItem.compte
                      );
                    };
                    
                    // Appliquer les suppressions aux modifications ultérieures
                    const futureModifications = newUserData.budgetPlanning.modifications
                      .filter(m => m.dateEffet > dateStr);
                    
                    futureModifications.forEach(futureMod => {
                      let futureEntrees = [...(futureMod.entrees || [])];
                      let futureSorties = [...(futureMod.sorties || [])];
                      
                      deletedItems.forEach(deleted => {
                        if (deleted.type === 'entree') {
                          const idx = findMatchingItemIndex(futureEntrees, deleted.item);
                          if (idx !== -1) {
                            futureEntrees.splice(idx, 1);
                          }
                        } else {
                          const idx = findMatchingItemIndex(futureSorties, deleted.item);
                          if (idx !== -1) {
                            futureSorties.splice(idx, 1);
                          }
                        }
                      });
                      
                      futureMod.entrees = futureEntrees;
                      futureMod.sorties = futureSorties;
                    });
                    // ============================================
                    
                    const existingIndex = newUserData.budgetPlanning.modifications
                      .findIndex(m => m.dateEffet === dateStr);
                    
                    if (existingIndex >= 0) {
                      newUserData.budgetPlanning.modifications[existingIndex] = newModification;
                    } else {
                      newUserData.budgetPlanning.modifications.push(newModification);
                    }
                    
                    saveUserData(newUserData);
                    
                    // Fermer tous les popups et incrémenter la version
                    setConfirmDeletePopup(null);
                    setEditingBudgetItem(null);
                    setBudgetVersion(v => v + 1);
                    
                    // Déclencher le recalcul GPS
                    triggerRecalculation(() => {
                      console.log('Item supprimé et recalculé');
                    });
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.95em',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup de confirmation de modification */}
      {confirmSavePopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '0',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
            animation: 'bounceIn 0.3s ease',
            overflow: 'hidden'
          }}>
            {/* Header violet */}
            <div style={{
              background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
              padding: '25px 30px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.8em' }}>📝</span>
                <h3 style={{ margin: 0, fontSize: '1.3em', fontWeight: 'bold' }}>
                  Confirmer {confirmSavePopup.isNew ? "l'ajout" : 'la modification'}
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.9em', opacity: 0.9 }}>
                Budget à partir du <strong>{confirmSavePopup.dateLabel}</strong>
              </p>
            </div>

            {/* Contenu */}
            <div style={{ padding: '25px 30px' }}>
              {/* Résumé de la modification */}
              <div style={{
                background: confirmSavePopup.itemType === 'entree' 
                  ? 'rgba(39, 174, 96, 0.1)' 
                  : 'rgba(231, 76, 60, 0.1)',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '20px',
                border: `2px solid ${confirmSavePopup.itemType === 'entree' ? '#3498db' : '#e74c3c'}`
              }}>
                <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: '#2c3e50' }}>
                  {confirmSavePopup.itemDescription}
                </p>
                <p style={{
                  margin: 0,
                  fontSize: '1.4em',
                  fontWeight: 'bold',
                  color: confirmSavePopup.itemType === 'entree' ? '#3498db' : '#e74c3c'
                }}>
                  {confirmSavePopup.itemType === 'entree' ? '+' : '-'}
                  {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(parseFloat(confirmSavePopup.itemMontant) || 0)}
                </p>
              </div>

              {/* Message d'information */}
              <div style={{
                background: '#f8f9fa',
                borderRadius: '10px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '1.2em' }}>🛣️</span>
                  <div style={{ fontSize: '0.85em', color: '#5d6d7e', lineHeight: 1.5 }}>
                    <p style={{ margin: 0 }}>
                      Cette modification affectera <strong>votre parcours financier</strong> à partir de cette date.
                    </p>
                    {confirmSavePopup.linkedItem && (
                      <p style={{ margin: '8px 0 0', fontWeight: 'bold', color: '#667eea' }}>
                        🔄 Le transfert lié ({confirmSavePopup.linkedItem.compte}) sera également mis à jour.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Boutons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setConfirmSavePopup(null)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: '2px solid #bdc3c7',
                    background: 'white',
                    color: '#7f8c8d',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.95em',
                    transition: 'all 0.2s'
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Exécuter la sauvegarde
                    const newMontantNum = parseFloat(editMontant) || 0;
                    
                    const updatedItem = {
                      description: editDescription,
                      montant: newMontantNum,
                      frequence: editFrequence,
                      jourRecurrence: editJourRecurrence === '' ? 1 : editJourRecurrence,
                      jourSemaine: editJourSemaine,
                      moisRecurrence: editFrequence === 'annuel' ? editMoisRecurrence : '',
                      dateReference: editFrequence === 'bimensuel' ? editDateReference : '',
                      dateDepart: (editFrequence === 'trimestriel' || editFrequence === 'semestriel' || editFrequence === 'uneFois') ? editDateDepart : '',
                      dateFinRecurrence: (editFrequence === 'trimestriel' || editFrequence === 'semestriel') ? editDateFinRecurrence : '',
                      compte: editCompte
                    };
                    
                    const currentEffectiveBudget = getEffectiveBudget(budgetEditPopup.dateStr);
                    let newEntrees = JSON.parse(JSON.stringify(currentEffectiveBudget.entrees));
                    let newSorties = JSON.parse(JSON.stringify(currentEffectiveBudget.sorties));
                    
                    if (editingBudgetItem.type === 'entree') {
                      if (editingBudgetItem.isNew) {
                        // Ajouter un nouvel item
                        newEntrees.push(updatedItem);
                      } else {
                        // Modifier un item existant
                        newEntrees[editingBudgetItem.index] = {
                          ...newEntrees[editingBudgetItem.index],
                          ...updatedItem
                        };
                        // Si item lié, mettre à jour aussi la sortie liée
                        if (editingBudgetItem.linkedItem && editingBudgetItem.linkedItem.index !== undefined) {
                          const linkedIndex = editingBudgetItem.linkedItem.index;
                          newSorties[linkedIndex] = {
                            ...newSorties[linkedIndex],
                            montant: updatedItem.montant,
                            frequence: updatedItem.frequence,
                            jourRecurrence: updatedItem.jourRecurrence,
                            jourSemaine: updatedItem.jourSemaine,
                            moisRecurrence: updatedItem.moisRecurrence,
                            dateReference: updatedItem.dateReference
                          };
                        }
                      }
                    } else {
                      if (editingBudgetItem.isNew) {
                        // Ajouter un nouvel item
                        newSorties.push(updatedItem);
                      } else {
                        // Modifier un item existant
                        newSorties[editingBudgetItem.index] = {
                          ...newSorties[editingBudgetItem.index],
                          ...updatedItem
                        };
                        // Si item lié, mettre à jour aussi l'entrée liée
                        if (editingBudgetItem.linkedItem && editingBudgetItem.linkedItem.index !== undefined) {
                          const linkedIndex = editingBudgetItem.linkedItem.index;
                          newEntrees[linkedIndex] = {
                            ...newEntrees[linkedIndex],
                            montant: updatedItem.montant,
                            frequence: updatedItem.frequence,
                            jourRecurrence: updatedItem.jourRecurrence,
                            jourSemaine: updatedItem.jourSemaine,
                            moisRecurrence: updatedItem.moisRecurrence,
                            dateReference: updatedItem.dateReference
                          };
                        }
                      }
                    }
                    
                    const newModification = {
                      dateEffet: budgetEditPopup.dateStr,
                      entrees: newEntrees,
                      sorties: newSorties,
                      createdAt: new Date().toISOString()
                    };
                    
                    const newUserData = JSON.parse(JSON.stringify(userData));
                    
                    if (!newUserData.budgetPlanning.modifications) {
                      newUserData.budgetPlanning.modifications = [];
                    }
                    
                    // ============================================
                    // PROPAGATION DES CHANGEMENTS AUX MODIFICATIONS ULTÉRIEURES
                    // ============================================
                    const currentDateStr = budgetEditPopup.dateStr;
                    const oldBudget = currentEffectiveBudget;
                    
                    // Fonction pour trouver un item correspondant par description + compte
                    const findMatchingItemIndex = (items, targetItem) => {
                      return items.findIndex(item => 
                        item.description === targetItem.description && 
                        item.compte === targetItem.compte
                      );
                    };
                    
                    // Détecter les changements
                    const detectChanges = (oldItems, newItems, type) => {
                      const changes = { added: [], removed: [], modified: [] };
                      
                      // Détecter les ajouts et modifications
                      newItems.forEach((newItem, newIndex) => {
                        const oldIndex = findMatchingItemIndex(oldItems, newItem);
                        if (oldIndex === -1) {
                          // Nouvel item ajouté
                          changes.added.push({ item: newItem, type });
                        } else {
                          // Vérifier si modifié
                          const oldItem = oldItems[oldIndex];
                          if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
                            changes.modified.push({ oldItem, newItem, type });
                          }
                        }
                      });
                      
                      // Détecter les suppressions
                      oldItems.forEach((oldItem) => {
                        const newIndex = findMatchingItemIndex(newItems, oldItem);
                        if (newIndex === -1) {
                          changes.removed.push({ item: oldItem, type });
                        }
                      });
                      
                      return changes;
                    };
                    
                    const entreesChanges = detectChanges(oldBudget.entrees, newEntrees, 'entree');
                    const sortiesChanges = detectChanges(oldBudget.sorties, newSorties, 'sortie');
                    
                    // Appliquer les changements aux modifications ultérieures
                    const futureModifications = newUserData.budgetPlanning.modifications
                      .filter(m => m.dateEffet > currentDateStr);
                    
                    futureModifications.forEach(futureMod => {
                      let futureEntrees = [...(futureMod.entrees || [])];
                      let futureSorties = [...(futureMod.sorties || [])];
                      
                      // Appliquer les ajouts
                      entreesChanges.added.forEach(change => {
                        const existingIndex = findMatchingItemIndex(futureEntrees, change.item);
                        if (existingIndex === -1) {
                          futureEntrees.push(JSON.parse(JSON.stringify(change.item)));
                        }
                      });
                      sortiesChanges.added.forEach(change => {
                        const existingIndex = findMatchingItemIndex(futureSorties, change.item);
                        if (existingIndex === -1) {
                          futureSorties.push(JSON.parse(JSON.stringify(change.item)));
                        }
                      });
                      
                      // Appliquer les suppressions
                      entreesChanges.removed.forEach(change => {
                        const idx = findMatchingItemIndex(futureEntrees, change.item);
                        if (idx !== -1) {
                          futureEntrees.splice(idx, 1);
                        }
                      });
                      sortiesChanges.removed.forEach(change => {
                        const idx = findMatchingItemIndex(futureSorties, change.item);
                        if (idx !== -1) {
                          futureSorties.splice(idx, 1);
                        }
                      });
                      
                      // Appliquer les modifications
                      entreesChanges.modified.forEach(change => {
                        const idx = findMatchingItemIndex(futureEntrees, change.oldItem);
                        if (idx !== -1) {
                          futureEntrees[idx] = JSON.parse(JSON.stringify(change.newItem));
                        }
                      });
                      sortiesChanges.modified.forEach(change => {
                        const idx = findMatchingItemIndex(futureSorties, change.oldItem);
                        if (idx !== -1) {
                          futureSorties[idx] = JSON.parse(JSON.stringify(change.newItem));
                        }
                      });
                      
                      // Mettre à jour la modification future
                      futureMod.entrees = futureEntrees;
                      futureMod.sorties = futureSorties;
                    });
                    // ============================================
                    
                    const existingIndex = newUserData.budgetPlanning.modifications
                      .findIndex(m => m.dateEffet === budgetEditPopup.dateStr);
                    
                    if (existingIndex >= 0) {
                      newUserData.budgetPlanning.modifications[existingIndex] = newModification;
                    } else {
                      newUserData.budgetPlanning.modifications.push(newModification);
                    }
                    
                    // Sauvegarder la modification
                    saveUserData(newUserData);
                    console.log('Modification sauvegardee pour date:', budgetEditPopup.dateStr);
                    setBudgetVersion(v => v + 1);
                    
                    // Fermer seulement les popups de confirmation/édition (garder le modal principal ouvert)
                    setConfirmSavePopup(null);
                    setEditingBudgetItem(null);
                    // Note: ne pas fermer budgetEditPopup - l'utilisateur peut faire d'autres modifications
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.95em',
                    boxShadow: '0 4px 15px rgba(155, 89, 182, 0.4)',
                    transition: 'all 0.2s'
                  }}
                >
                  ✓ {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP TRANSACTIONS DU JOUR */}
      {todayTransactionsPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '0',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'hidden',
            boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
            animation: 'bounceIn 0.3s ease'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '25px 30px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '2em' }}>📅</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3em', fontWeight: 'bold' }}>
                    {t('accounts.transactions.title')}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85em', opacity: 0.9 }}>
                    {todayTransactionsPopup.dateLabel}
                  </p>
                </div>
              </div>
            </div>

            {/* Contenu - Liste des transactions */}
            <div style={{ padding: '20px 25px', maxHeight: '45vh', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 15px', color: '#7f8c8d', fontSize: '0.9em' }}>
                {t('gps.transactions.scheduledCount', { count: todayTransactionsPopup.transactions.length })}
              </p>
              
              {/* Liste des transactions groupées par compte */}
              {(() => {
                // Grouper par compte
                const groupedByAccount = {};
                todayTransactionsPopup.transactions.forEach(t => {
                  if (!groupedByAccount[t.compte]) {
                    groupedByAccount[t.compte] = { entrees: [], sorties: [], type: t.compteType };
                  }
                  if (t.isEntree) {
                    groupedByAccount[t.compte].entrees.push(t);
                  } else {
                    groupedByAccount[t.compte].sorties.push(t);
                  }
                });
                
                return Object.entries(groupedByAccount).map(([compteName, data]) => (
                  <div key={compteName} style={{
                    background: '#f8f9fa',
                    borderRadius: '12px',
                    padding: '15px',
                    marginBottom: '12px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      marginBottom: '10px',
                      fontWeight: 'bold',
                      color: '#2c3e50'
                    }}>
                      <span>{data.type === 'credit' ? '🏦' : data.type === 'epargne' ? '🐷' : '💳'}</span>
                      {compteName}
                    </div>
                    
                    {/* Entrées */}
                    {data.entrees.map((t, i) => {
                      const isConfirmed = isTransactionConfirmed(t.id);
                      return (
                        <div key={'e-'+i} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: isConfirmed ? 'rgba(39, 174, 96, 0.3)' : 'rgba(39, 174, 96, 0.1)',
                          borderRadius: '8px',
                          marginBottom: '6px',
                          border: isConfirmed ? '2px solid #27ae60' : '1px solid rgba(39, 174, 96, 0.2)',
                          opacity: isConfirmed ? 0.7 : 1,
                          transition: 'all 0.3s ease'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                            <button
                              onClick={() => !isConfirmed && confirmTransaction(t.id)}
                              disabled={isConfirmed}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: isConfirmed ? 'none' : '2px solid #27ae60',
                                background: isConfirmed ? '#27ae60' : 'white',
                                color: isConfirmed ? 'white' : '#27ae60',
                                cursor: isConfirmed ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                transition: 'all 0.2s',
                                flexShrink: 0
                              }}
                            >
                              {isConfirmed ? '✓' : ''}
                            </button>
                            <span style={{ 
                              fontSize: '0.9em', 
                              color: '#2c3e50',
                              textDecoration: isConfirmed ? 'line-through' : 'none'
                            }}>
                              {t.description}
                            </span>
                          </div>
                          <span style={{ fontWeight: 'bold', color: '#3498db' }}>
                            +{formatMontant(t.montant)}
                          </span>
                        </div>
                      );
                    })}
                    
                    {/* Sorties */}
                    {data.sorties.map((t, i) => {
                      const isConfirmed = isTransactionConfirmed(t.id);
                      return (
                        <div key={'s-'+i} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: isConfirmed ? 'rgba(231, 76, 60, 0.3)' : 'rgba(231, 76, 60, 0.1)',
                          borderRadius: '8px',
                          marginBottom: '6px',
                          border: isConfirmed ? '2px solid #e74c3c' : '1px solid rgba(231, 76, 60, 0.2)',
                          opacity: isConfirmed ? 0.7 : 1,
                          transition: 'all 0.3s ease'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                            <button
                              onClick={() => !isConfirmed && confirmTransaction(t.id)}
                              disabled={isConfirmed}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: isConfirmed ? 'none' : '2px solid #e74c3c',
                                background: isConfirmed ? '#e74c3c' : 'white',
                                color: isConfirmed ? 'white' : '#e74c3c',
                                cursor: isConfirmed ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                transition: 'all 0.2s',
                                flexShrink: 0
                              }}
                            >
                              {isConfirmed ? '✓' : ''}
                            </button>
                            <span style={{ 
                              fontSize: '0.9em', 
                              color: '#2c3e50',
                              textDecoration: isConfirmed ? 'line-through' : 'none'
                            }}>
                              {t.description}
                            </span>
                          </div>
                          <span style={{ fontWeight: 'bold', color: '#e74c3c' }}>
                            -{formatMontant(t.montant)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>

            {/* Footer - Boutons */}
            <div style={{
              padding: '20px 25px',
              borderTop: '1px solid #eee',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {/* 🆕 Compteur de transactions confirmées */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                background: confirmedTransactions.length === todayTransactionsPopup?.transactions?.length 
                  ? 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)' 
                  : '#f8f9fa',
                borderRadius: '10px',
                marginBottom: '5px'
              }}>
                <span style={{ fontSize: '1.2em' }}>
                  {confirmedTransactions.length === todayTransactionsPopup?.transactions?.length ? '🎉' : '📋'}
                </span>
                <span style={{ 
                  fontWeight: '600', 
                  color: confirmedTransactions.length === todayTransactionsPopup?.transactions?.length ? '#155724' : '#495057'
                }}>
                  {confirmedTransactions.length === todayTransactionsPopup?.transactions?.length 
                    ? t('gps.transactions.allConfirmed', 'Toutes les transactions confirmées!')
                    : `${confirmedTransactions.length} / ${todayTransactionsPopup?.transactions?.length || 0} ${t('gps.transactions.confirmed', 'confirmées')}`
                  }
                </span>
              </div>
              
              {/* Bouton principal - Aller aux comptes */}
              <button
                onClick={() => {
                  // 🆕 Ne plus marquer tout comme confirmé - juste fermer et naviguer
                  setTodayTransactionsPopup(null);
                  navigate('/comptes');
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.95em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(52, 152, 219, 0.4)'
                }}
              >
                💼 {t('gps.transactions.goToAccounts', 'Aller à mes comptes')}  
              </button>
              
              {/* Bouton secondaire */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    // ✅ FIX: Utiliser sessionStorage pour bloquer le popup CETTE SESSION seulement
                    // Le popup réapparaîtra à la prochaine connexion/session
                    const remindLaterKey = `gps_transactions_remind_later_${todayStr}`;
                    sessionStorage.setItem(remindLaterKey, 'true');
                    setRemindLaterClicked(true); // Permet aux autres badges d'apparaître
                    setTodayTransactionsPopup(null);
                  }}
                  style={{
                    flex: 1,
                    maxWidth: '200px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid #3498db',
                    background: 'white',
                    color: '#3498db',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.85em'
                  }}
                >
                  🔔 Me le rappeler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP ALERTE DÉCOUVERT */}
      {overdraftAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '0',
            maxWidth: '450px',
            width: '90%',
            overflow: 'hidden',
            boxShadow: '0 25px 80px rgba(243, 156, 18, 0.4)',
            animation: 'bounceIn 0.3s ease'
          }}>
            {/* Header Orange/Jaune */}
            <div style={{
              background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
              padding: '25px 30px',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Animation clignotante */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255,255,255,0.2)',
                animation: 'pulse-alert 1.5s ease-in-out infinite'
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '2.5em' }}>⚠️</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold' }}>
                      {t('gps.overdraftAlert.title')}
                    </h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenu */}
            <div style={{ padding: '25px 30px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '2px solid #f39c12',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.95em', color: '#92400e' }}>
                  {t('gps.overdraftAlert.message', {
                    amount: formatMontant(Math.abs(overdraftAlert.amount)),
                    date: overdraftAlert.label
                  })}
                </p>
                <p style={{ margin: 0, fontSize: '0.85em', color: '#7f8c8d' }}>
                  💳 {overdraftAlert.accountName}
                </p>
              </div>

              <p style={{
                margin: '0 0 20px',
                fontSize: '0.95em',
                color: '#64748b',
                textAlign: 'center'
              }}>
                {t('gps.overdraftAlert.suggestion')}
              </p>

              {/* Boutons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    localStorage.setItem(`gps_overdraft_alert_dismissed_${todayStr}`, 'true');
                    setOverdraftAlert(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: '2px solid #e0e0e0',
                    background: 'white',
                    color: '#7f8c8d',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.9em'
                  }}
                >
                  {t('gps.overdraftAlert.dismiss')}
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem(`gps_overdraft_alert_dismissed_${todayStr}`, 'true');
                    const targetDateStr = overdraftAlert.dateStr;
                    setOverdraftAlert(null);
                    // Naviguer vers la date du découvert en mode plein écran
                    setViewMode('day');
                    setIsFullScreen(true);
                    // Trouver l'index de la ligne correspondante
                    const targetIndex = displayData.findIndex(d => d.dateStr === targetDateStr);
                    if (targetIndex >= 0) {
                      setSelectedRowIndex(targetIndex);
                      // Scroll vers la ligne après un court délai
                      setTimeout(() => {
                        const row = document.querySelector(`[data-date="${targetDateStr}"]`);
                        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 300);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.9em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  📅 {t('gps.overdraftAlert.viewDetails')}
                </button>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem(`gps_overdraft_alert_dismissed_${todayStr}`, 'true');
                  setOverdraftAlert(null);
                  setIsFullScreen(false);
                  navigate('/budget');
                }}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.95em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(39, 174, 96, 0.4)'
                }}
              >
                🛠️ {t('gps.overdraftAlert.adjustBudget')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL GUIDE ONBOARDING ===== */}
      <PageGuideModal
        isOpen={showGuide}
        onClose={closeModal}
        icon="✨"
        titleKey="gps.guideModal.title"
        messageKey="gps.guideModal.message"
        hintIcon="👆"
        hintKey="gps.guideModal.hint"
      />

      {/* ===== TOOLTIP TOUR ===== */}
      <TooltipTour
        isActive={isTooltipActive}
        currentTooltip={currentTooltip}
        currentStep={tooltipStep}
        totalSteps={tooltipTotal}
        onNext={nextTooltip}
        onPrev={prevTooltip}
        onSkip={skipTooltips}
      />

      {/* Modal d'upgrade pour restrictions d'abonnement */}
      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ isOpen: false, type: null })}
        limitType={upgradeModal.type}
      />

      {/* 🔄 Modal Optimisation */}
      <OptimizationModal
        isOpen={showOptimizationPopup}
        onClose={() => setShowOptimizationPopup(false)}
        optimizedBudgets={optimizedBudgets}
        optimizedCount={optimizedCount}
        formatMontant={formatMontant}
        userData={userData}
        saveUserData={saveUserData}
        baseBudgetEntrees={baseBudgetEntrees}
        baseBudgetSorties={baseBudgetSorties}
        profileEndDate={(() => { const d = new Date(); d.setFullYear(d.getFullYear() + 54); return d; })()}
        allDayData={allDayData}
        onOptimizationApplied={() => {
          // Déclencher l'effet de brillance (optionnel en mode Itinéraire)
          setRouteGlowEffect(true);
          setTimeout(() => setRouteGlowEffect(false), 2500);
        }}
      />

      {/* 💡 Modal Recommandation de réduction de remboursement */}
      {showPaymentRecommendation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '500px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)',
              padding: '20px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2em' }}>🎉 {t('gps.recommendation.debtPaidOff', 'Dette remboursée!')}</h3>
                  <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '0.85em' }}>
                    {t('gps.recommendation.reducePayment', 'Réduire le remboursement')}
                  </p>
                </div>
                <button
                  onClick={() => setShowPaymentRecommendation(null)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    color: 'white',
                    fontSize: '1.2em',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
              {/* Boutons de navigation si plusieurs recommandations */}
              {paymentRecommendations.length > 1 && (
                <div style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newIndex = (currentRecommendationIndex - 1 + paymentRecommendations.length) % paymentRecommendations.length;
                      setCurrentRecommendationIndex(newIndex);
                      setShowPaymentRecommendation(paymentRecommendations[newIndex]);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.25)',
                      border: 'none',
                      color: 'white',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '1em',
                      fontWeight: 'bold'
                    }}
                  >
                    ◀
                  </button>
                  <span style={{ fontSize: '0.9em', fontWeight: 'bold' }}>
                    {currentRecommendationIndex + 1} / {paymentRecommendations.length}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newIndex = (currentRecommendationIndex + 1) % paymentRecommendations.length;
                      setCurrentRecommendationIndex(newIndex);
                      setShowPaymentRecommendation(paymentRecommendations[newIndex]);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.25)',
                      border: 'none',
                      color: 'white',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '1em',
                      fontWeight: 'bold'
                    }}
                  >
                    ▶
                  </button>
                </div>
              )}
            </div>
            
            {/* Contenu */}
            <div style={{ padding: '25px' }}>
              {/* Explication */}
              <div style={{
                background: '#e8f5e9',
                border: '2px solid #3498db',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: 0, fontSize: '0.9em', color: '#2e7d32' }}>
                  ✅ {t('gps.recommendation.creditWillBeZero', 'Votre crédit')} <strong>{showPaymentRecommendation.creditAccount}</strong> {t('gps.recommendation.willBePaidOff', 'sera remboursé le')}{' '}
                  <strong>{new Date(showPaymentRecommendation.creditZeroDateStr).toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.
                </p>
                <p style={{ margin: '10px 0 0', fontSize: '0.85em', color: '#388e3c' }}>
                  💡 {t('gps.recommendation.reduceToExpenses', 'Après cette date, vous n\'aurez qu\'à couvrir vos dépenses mensuelles de')} <strong>{formatMontant(showPaymentRecommendation.sortiesMensuelles)}</strong>.
                </p>
              </div>
              
              {/* Budget concerné */}
              <div style={{
                background: '#f8f9fa',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '20px',
                border: '2px solid #e0e0e0'
              }}>
                <p style={{ margin: '0 0 10px', fontSize: '0.85em', color: '#7f8c8d' }}>
                  {t('gps.recommendation.budgetConcerned', 'Budget concerné')}:
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.5em' }}>🟢</span>
                  <div>
                    <strong style={{ color: '#2c3e50' }}>{showPaymentRecommendation.remboursementBudget.description}</strong>
                    <p style={{ margin: '3px 0 0', fontSize: '0.8em', color: '#7f8c8d' }}>
                      {showPaymentRecommendation.creditAccount} • {t('gps.recommendation.repayment', 'Remboursement')}
                    </p>
                  </div>
                </div>
                {/* Note sur le changement de fréquence */}
                {showPaymentRecommendation.remboursementBudget.frequence !== 'mensuel' && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    background: '#fff3e0',
                    borderRadius: '8px',
                    fontSize: '0.8em',
                    color: '#e65100'
                  }}>
                    📌 {t('gps.recommendation.frequencyNote', 'La fréquence sera changée en "Mensuel" pour correspondre au calcul.')}
                  </div>
                )}
              </div>
              
              {/* Date proposée */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.85em', color: '#7f8c8d', display: 'block', marginBottom: '5px' }}>
                  📅 {t('gps.recommendation.proposedDate', 'Date proposée pour la modification')}
                </label>
                <div style={{
                  background: '#e3f2fd',
                  padding: '12px 15px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  color: '#1565c0'
                }}>
                  {showPaymentRecommendation.prochaineDate 
                    ? showPaymentRecommendation.prochaineDate.toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                      })
                    : t('gps.recommendation.noDate', 'Aucune date trouvée')
                  }
                </div>
              </div>
              
              {/* Changement de montant */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.85em', color: '#7f8c8d', display: 'block', marginBottom: '5px' }}>
                  💰 {t('gps.recommendation.amountChange', 'Changement proposé')}
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '15px',
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '12px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8em', color: '#7f8c8d' }}>{t('gps.recommendation.current', 'Actuel')}</div>
                    <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#2c3e50' }}>
                      {formatMontant(showPaymentRecommendation.montantActuel)}
                    </div>
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    fontSize: '0.9em'
                  }}>
                    →
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8em', color: '#7f8c8d' }}>{t('gps.recommendation.proposed', 'Proposé')}</div>
                    <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#3498db' }}>
                      {formatMontant(showPaymentRecommendation.nouveauMontant)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Impact */}
              <div style={{
                background: 'linear-gradient(135deg, #f39c1215 0%, #e67e2215 100%)',
                borderRadius: '12px',
                padding: '15px',
                border: '2px solid #f39c1240',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, fontSize: '0.9em', color: '#e67e22' }}>
                  {t('gps.recommendation.savings', 'Économie par mois')}
                </p>
                <p style={{ margin: '5px 0 0', fontSize: '1.5em', fontWeight: 'bold', color: '#e67e22' }}>
                  +{formatMontant(showPaymentRecommendation.economie)}
                </p>
                <p style={{ margin: '5px 0 0', fontSize: '0.8em', color: '#7f8c8d' }}>
                  {t('gps.recommendation.redirectToOtherGoals', 'à rediriger vers vos autres objectifs')}
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div style={{
              padding: '15px 25px 25px',
              borderTop: '1px solid #e0e0e0',
              background: '#f8f9fa'
            }}>
              {/* Navigation entre recommandations */}
              {paymentRecommendations.length > 1 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '10px', 
                  marginBottom: '15px' 
                }}>
                  <button
                    onClick={() => {
                      const newIndex = currentRecommendationIndex > 0 ? currentRecommendationIndex - 1 : paymentRecommendations.length - 1;
                      setCurrentRecommendationIndex(newIndex);
                      setShowPaymentRecommendation(paymentRecommendations[newIndex]);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #bdc3c7',
                      background: 'white',
                      color: '#7f8c8d',
                      cursor: 'pointer',
                      fontSize: '0.85em'
                    }}
                  >
                    ◀ {t('common.previous', 'Précédent')}
                  </button>
                  <button
                    onClick={() => {
                      const newIndex = currentRecommendationIndex < paymentRecommendations.length - 1 ? currentRecommendationIndex + 1 : 0;
                      setCurrentRecommendationIndex(newIndex);
                      setShowPaymentRecommendation(paymentRecommendations[newIndex]);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #bdc3c7',
                      background: 'white',
                      color: '#7f8c8d',
                      cursor: 'pointer',
                      fontSize: '0.85em'
                    }}
                  >
                    {t('common.next', 'Suivant')} ▶
                  </button>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowPaymentRecommendation(null)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: '2px solid #bdc3c7',
                    background: 'white',
                    color: '#7f8c8d',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {t('common.later', 'Plus tard')}
                </button>
                <button
                  onClick={() => {
                    // Ouvrir le modal de budget à la date proposée
                    if (showPaymentRecommendation.prochaineDateStr) {
                      const dateObj = new Date(showPaymentRecommendation.prochaineDateStr + 'T00:00:00');
                      const dateLabel = dateObj.toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                      });
                      
                      setBudgetEditPopup({
                        dateStr: showPaymentRecommendation.prochaineDateStr,
                        dateLabel: dateLabel,
                        viewType: 'day',
                        // Infos pour pré-sélection
                        preSelectBudget: {
                          type: 'entree',
                          description: showPaymentRecommendation.remboursementBudget.description,
                          compte: showPaymentRecommendation.creditAccount,
                          suggestedAmount: showPaymentRecommendation.nouveauMontant,
                          suggestedFrequence: showPaymentRecommendation.suggestedFrequence || 'mensuel'
                        }
                      });
                    }
                    setShowPaymentRecommendation(null);
                  }}
                  style={{
                    flex: 1.5,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)'
                  }}
                >
                  ✅ {t('gps.recommendation.applyNow', 'Appliquer')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📨 Modal Proposition PL4TO */}
      <PL4TOProposalModal
        isOpen={showPL4TOProposal}
        onClose={() => setShowPL4TOProposal(false)}
        proposal={activeProposal}
        onAccepted={() => {
          setShowPL4TOProposal(false);
          setActiveProposal(null);
          // Recharger les données
          window.location.reload();
        }}
        onRejected={() => {
          setShowPL4TOProposal(false);
          setActiveProposal(null);
        }}
        formatMontant={formatMontant}
      />

      </div>

    </div>
  );
};

export default GPSFinancier;
