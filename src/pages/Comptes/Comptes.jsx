// 💼 MES COMPTES - Page style GPS avec disposition en arc (pare-brise)
// Design: Route GPS avec comptes positionnés À L'INTÉRIEUR du demi-cercle
// v11: Mode plein écran + limite crédit + effet brillance GPS + Sync backend
// 🌍 i18n enabled
// ✅ Utilise useGuideProgress pour la logique centralisée
// 🎨 Theme support

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserData } from '../../context/UserDataContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme } from '../../context/ThemeContext';
import { UpgradeModal, LimitBadge } from '../../components/common/UpgradePrompt';
import Toast from '../../components/common/Toast';
import useGuideProgress from '../../hooks/useGuideProgress';
import useTooltipTour from '../../hooks/useTooltipTour';
import PageGuideModal from '../../components/common/PageGuideModal';
import TooltipTour from '../../components/common/TooltipTour';
import useAllDayData from '../../hooks/useAllDayData';
import NumpadModal from '../../components/common/NumpadModal';

// Composant O animé pour le bouton GPS
const AnimatedOButton = ({ size = 45, glow = false, isDark = true }) => (
  <div style={{
    position: 'relative',
    width: `${size}px`,
    height: `${size}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <div style={{
      position: 'absolute',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      border: '3px solid transparent',
      background: isDark 
        ? 'linear-gradient(#040449, #100261) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box'
        : 'linear-gradient(#ffffff, #ffffff) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box',
      animation: glow ? 'gps-ring-spin 2s linear infinite, gps-glow 1s ease-in-out infinite' : 'gps-ring-spin 3s linear infinite',
      boxShadow: glow ? '0 0 25px rgba(255, 165, 0, 0.8)' : '0 0 15px rgba(255, 165, 0, 0.5)'
    }} />
  </div>
);

const Comptes = () => {
  const { t, i18n } = useTranslation();
  const { userData, updateAccountBalance, saveUserData, isSyncing } = useUserData();
  const { canAddMore, getRemainingCount, limits, currentPlan } = useSubscription();
  const { theme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  // ✅ Hook centralisé pour la progression du guide
  const { isPageAccessible, shouldShowGuide, markGuideCompleted, isGuideComplete, isLoading: isGuideLoading } = useGuideProgress();
  
  // ✅ Hook pour le tour de tooltips
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
  } = useTooltipTour('comptes', {
    onComplete: () => setShowContinueBar(true)
  });
  
  // 🔧 Debug: Fonction globale pour tester les tooltips
  useEffect(() => {
    window.startComptesTour = () => {
      resetTooltips();
      setTimeout(() => startTooltipTour(), 100);
    };
    return () => delete window.startComptesTour;
  }, [startTooltipTour, resetTooltips]);
  
  // État pour le guide utilisateur
  const [showGuide, setShowGuide] = useState(false);
  const [showContinueBar, setShowContinueBar] = useState(false);
  
  // ✅ Boutons GPS débloqués seulement après "Terminer!" (fin complète du guide)
  const isGpsAccessible = isGuideComplete;
  
  // Vérifier si le guide doit être affiché
  useEffect(() => {
    if (!isGuideLoading && shouldShowGuide('comptes')) {
      setShowGuide(true);
    }
  }, [shouldShowGuide, isGuideLoading]);
  
  // Fermer le modal et démarrer le tour de tooltips
  const closeModal = () => {
    setShowGuide(false);
    startTooltipTour(); // Démarre le tour de tooltips
  };
  
  // Marquer comme complété et passer à la page suivante
  const continueToNextPage = () => {
    setShowContinueBar(false);
    markGuideCompleted('comptes');
    setTimeout(() => {
      navigate('/budget');
    }, 100);
  };
  
  // État pour le modal d'upgrade (restrictions abonnement)
  const [upgradeModal, setUpgradeModal] = useState({ isOpen: false, type: null });
  
  // État pour les toasts de notification
  const [toast, setToast] = useState(null);
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };
  
  const hideToast = () => {
    setToast(null);
  };
  
  // ========== FONCTION POUR MARQUER UN COMPTE COMME CONFIRMÉ AUJOURD'HUI ==========
  // Cela empêche le GPS Financier de recalculer les transactions du jour pour ce compte
  const markAccountAsConfirmedToday = (accountName) => {
    const todayKey = new Date().toISOString().split('T')[0];
    const storageKey = 'pl4to_confirmed_accounts';
    
    // Récupérer les comptes déjà confirmés
    let confirmedData = {};
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        confirmedData = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erreur lecture localStorage:', e);
    }
    
    // Nettoyer les anciennes dates (garder seulement aujourd'hui)
    confirmedData = { [todayKey]: confirmedData[todayKey] || [] };
    
    // Ajouter le compte s'il n'est pas déjà dans la liste
    if (!confirmedData[todayKey].includes(accountName)) {
      confirmedData[todayKey].push(accountName);
    }
    
    // Sauvegarder
    localStorage.setItem(storageKey, JSON.stringify(confirmedData));
    console.log(`[Comptes] ${accountName} marqué comme confirmé pour ${todayKey}`);
  };
  
  // 📱 Détection mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // État pour le mode plein écran - Démarre en fullscreen sur mobile
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
  
  // Gérer le clic sur le pare-brise: plein écran
  const handleWindshieldClick = () => {
    if (!isFullScreen) {
      setIsFullScreen(true);
    }
  };
  
  // État pour le compte surligné (depuis GPS Financier)
  const [highlightedAccount, setHighlightedAccount] = useState(null);
  
  // État pour l'effet brillance sur le bouton GPS
  const [gpsButtonGlow, setGpsButtonGlow] = useState(false);
  
  // État pour le modal de confirmation des transactions du jour
  const [showTransactionConfirmModal, setShowTransactionConfirmModal] = useState(false);
  const [todayTransactions, setTodayTransactions] = useState([]);
  const [confirmedAccounts, setConfirmedAccounts] = useState(new Set());
  
  // État pour le mode GO (visualisation de l'évolution des soldes)
  const [isGoMode, setIsGoMode] = useState(false);
  const [goDayIndex, setGoDayIndex] = useState(0);
  
  // État pour le tutoriel du mode GO (affiché une seule fois)
  const [showGoTutorial, setShowGoTutorial] = useState(() => {
    return !localStorage.getItem('pl4to_go_tutorial_seen');
  });
  
  // Direction du scroll pour l'indicateur visuel (flèche)
  const [scrollDirection, setScrollDirection] = useState('forward');
  
  // ========== ANIMATION DE COMPTAGE DES SOLDES (MODE GO) ==========
  const [animatingGoAccounts, setAnimatingGoAccounts] = useState({});
  const prevGoDayIndexRef = useRef(0);
  
  // Fonction d'animation de comptage progressif (comme dans GPSFinancier)
  const animateGoAccountValue = useCallback((accountName, fromValue, toValue) => {
    const duration = 500; // 500ms pour l'animation
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Courbe ease-out cubique pour un effet fluide
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = fromValue + (toValue - fromValue) * easeOut;
      
      setAnimatingGoAccounts(prev => ({
        ...prev,
        [accountName]: currentValue
      }));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, []);
  
  // Date du jour formatée
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const formattedDate = today.toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Calculer les transactions du jour
  useEffect(() => {
    if (userData && userData.budgetEntrees && userData.budgetSorties) {
      const todayDay = today.getDate();
      const todayDayOfWeek = today.getDay(); // 0 = dimanche
      
      const transactions = [];
      
      // Fonction pour vérifier si une transaction est pour aujourd'hui
      const isTransactionToday = (item) => {
        const jourRecurrence = parseInt(item.jourRecurrence) || 1;
        
        switch (item.frequence) {
          case 'mensuel':
            return jourRecurrence === todayDay;
          case 'quinzaine':
          case 'bimensuel':
            return jourRecurrence === todayDay || 
                   (jourRecurrence + 15) === todayDay ||
                   (jourRecurrence <= 15 && (jourRecurrence + 15) === todayDay);
          case 'hebdomadaire':
            const mappedDay = jourRecurrence === 7 ? 0 : jourRecurrence;
            return mappedDay === todayDayOfWeek;
          default:
            return jourRecurrence === todayDay;
        }
      };
      
      // Vérifier les entrées
      userData.budgetEntrees.forEach(entree => {
        if (isTransactionToday(entree)) {
          transactions.push({
            type: 'entree',
            description: entree.description,
            montant: parseFloat(entree.montant) || 0,
            compte: entree.compte,
            frequence: entree.frequence
          });
        }
      });
      
      // Vérifier les sorties
      userData.budgetSorties.forEach(sortie => {
        if (isTransactionToday(sortie)) {
          transactions.push({
            type: 'sortie',
            description: sortie.description,
            montant: parseFloat(sortie.montant) || 0,
            compte: sortie.compte,
            frequence: sortie.frequence
          });
        }
      });
      
      setTodayTransactions(transactions);
      
      const params = new URLSearchParams(location.search);
      const forceShow = params.get('confirm') === 'true';
      const lastConfirmDate = localStorage.getItem('lastTransactionConfirmDate');
      
      if (transactions.length > 0 && (lastConfirmDate !== todayStr || forceShow)) {
        if (forceShow) {
          localStorage.removeItem('lastTransactionConfirmDate');
          window.history.replaceState({}, '', '/comptes');
        }
        setShowTransactionConfirmModal(true);
      }
    }
  }, [userData, todayStr, location.search]);
  
  // Lire le paramètre highlight de l'URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const accountToHighlight = params.get('highlight');
    if (accountToHighlight) {
      setHighlightedAccount(decodeURIComponent(accountToHighlight));
      const timer = setTimeout(() => {
        setHighlightedAccount(null);
        window.history.replaceState({}, '', '/comptes');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [location.search]);
  
  // État pour le modal de modification
  const [editingAccount, setEditingAccount] = useState(null);
  const [editForm, setEditForm] = useState({ nom: '', solde: '', limite: '' });
  
  // État pour le modal d'ajout
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    nom: '',
    type: 'cheque',
    institution: '',
    limite: '',
    solde: ''
  });

  // État pour les erreurs de formulaire
  const [formError, setFormError] = useState('');

  // État pour le modal de suppression
  const [deletingAccount, setDeletingAccount] = useState(null);
  
  // 🆕 État pour le NumpadModal (modification du solde)
  const [showNumpadModal, setShowNumpadModal] = useState(false);
  
  // 🆕 État pour le NumpadModal (ajout nouveau compte)
  const [showAddNumpadModal, setShowAddNumpadModal] = useState(false);
  // 🆕 État pour le NumpadModal (limite de crédit ajout)
  const [showAddLimiteNumpadModal, setShowAddLimiteNumpadModal] = useState(false);
  const [showEditLimiteNumpadModal, setShowEditLimiteNumpadModal] = useState(false);

  // Obtenir l'icône selon le type de compte
  const getAccountIcon = (type) => {
    const icons = {
      'cheque': '💳',
      'epargne': '🌱',
      'credit': '🏦',
      'hypotheque': '🏠'
    };
    return icons[type] || '💼';
  };

  // Obtenir la couleur selon le type
  const getAccountColor = (type) => {
    const colors = {
      'cheque': '#3498db',
      'epargne': '#3498db',
      'credit': '#ffa500',
      'hypotheque': '#9b59b6'
    };
    return colors[type] || '#7f8c8d';
  };

  // Obtenir le label du type (traduit)
  const getTypeLabel = (type) => {
    const labelKeys = {
      'cheque': 'accounts.types.cheque',
      'epargne': 'accounts.types.epargne',
      'credit': 'accounts.types.credit',
      'hypotheque': 'accounts.types.hypotheque'
    };
    return t(labelKeys[type]) || type;
  };

  // Formater le montant (locale-aware)
  const formatMontant = (montant) => {
    if (balancesHidden) return '••••••';
    return new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(montant);
  };

  // Grouper les transactions par compte
  const getTransactionsByAccount = () => {
    const grouped = {};
    
    todayTransactions.forEach(t => {
      if (!grouped[t.compte]) {
        grouped[t.compte] = {
          entrees: [],
          sorties: [],
          totalEntrees: 0,
          totalSorties: 0
        };
      }
      
      if (t.type === 'entree') {
        grouped[t.compte].entrees.push(t);
        grouped[t.compte].totalEntrees += t.montant;
      } else {
        grouped[t.compte].sorties.push(t);
        grouped[t.compte].totalSorties += t.montant;
      }
    });
    
    return grouped;
  };

  // Confirmer une transaction pour un compte
  const handleConfirmAccount = async (accountName) => {
    const account = userData.accounts.find(a => a.nom === accountName);
    const soldeInfo = userData.initialBalances.soldes.find(s => s.accountName === accountName);
    const transactions = getTransactionsByAccount()[accountName];
    
    if (soldeInfo && transactions) {
      const currentSolde = parseFloat(soldeInfo.solde) || 0;
      const isCredit = account?.type === 'credit';
      
      let newSolde;
      if (isCredit) {
        newSolde = currentSolde - transactions.totalEntrees + transactions.totalSorties;
      } else {
        newSolde = currentSolde + transactions.totalEntrees - transactions.totalSorties;
      }
      
      const updatedSoldes = userData.initialBalances.soldes.map(s => {
        if (s.accountName === accountName) {
          return { ...s, solde: newSolde.toFixed(2) };
        }
        return s;
      });
      
      const updatedUserData = {
        ...userData,
        initialBalances: {
          ...userData.initialBalances,
          soldes: updatedSoldes
        }
      };
      
      const success = await saveUserData(updatedUserData);
      if (success) {
        setConfirmedAccounts(prev => new Set([...prev, accountName]));
        showToast('✓', 'success');
        
        // Marquer ce compte comme confirmé pour aujourd'hui (pour éviter le recalcul)
        markAccountAsConfirmedToday(accountName);
      } else {
        showToast('⚠️ Erreur de sauvegarde', 'error');
      }
      
      // Activer l'effet brillance sur le bouton GPS
      setGpsButtonGlow(true);
      setTimeout(() => setGpsButtonGlow(false), 3000);
    }
  };

  // Confirmer toutes les transactions
  const handleConfirmAll = () => {
    const transactionsByAccount = getTransactionsByAccount();
    
    Object.keys(transactionsByAccount).forEach(accountName => {
      if (!confirmedAccounts.has(accountName)) {
        handleConfirmAccount(accountName);
      }
    });
  };

  // Fermer le modal et marquer comme vu
  const handleCloseConfirmModal = () => {
    localStorage.setItem('lastTransactionConfirmDate', todayStr);
    setShowTransactionConfirmModal(false);
    setConfirmedAccounts(new Set());
  };

  // ========== MODIFICATION ==========
  
  const handleEditClick = (account, solde) => {
    setEditingAccount(account);
    setEditForm({
      nom: account.nom,
      solde: solde?.solde || '0',
      limite: account.limite || ''
    });
  };

  const handleSaveEdit = async () => {
    if (editingAccount) {
      const oldName = editingAccount.nom;
      const newName = editForm.nom.trim();
      const nameChanged = oldName !== newName;
      
      // Mettre à jour le solde et le nom du compte dans les soldes
      const updatedSoldes = userData.initialBalances.soldes.map(s => {
        if (s.accountName === oldName) {
          return { 
            ...s, 
            accountName: newName,
            solde: editForm.solde.toString() 
          };
        }
        return s;
      });
      
      // Mettre à jour le nom et la limite dans accounts
      const updatedAccounts = userData.accounts.map(a => {
        if (a.nom === oldName) {
          return { 
            ...a, 
            nom: newName,
            limite: a.type === 'credit' ? editForm.limite : a.limite
          };
        }
        return a;
      });
      
      // Si le nom a changé, mettre à jour les références dans les budgets
      let updatedBudgetPlanning = userData.budgetPlanning;
      if (nameChanged && updatedBudgetPlanning) {
        const updatedEntrees = (updatedBudgetPlanning.entrees || []).map(e => {
          if (e.compte === oldName) {
            return { ...e, compte: newName };
          }
          return e;
        });
        
        const updatedSorties = (updatedBudgetPlanning.sorties || []).map(s => {
          if (s.compte === oldName) {
            return { ...s, compte: newName };
          }
          // Vérifier aussi compteSource et compteDestination pour les transferts
          let updated = { ...s };
          if (s.compteSource === oldName) updated.compteSource = newName;
          if (s.compteDestination === oldName) updated.compteDestination = newName;
          return updated;
        });
        
        updatedBudgetPlanning = {
          ...updatedBudgetPlanning,
          entrees: updatedEntrees,
          sorties: updatedSorties
        };
      }
      
      const updatedUserData = {
        ...userData,
        accounts: updatedAccounts,
        initialBalances: {
          ...userData.initialBalances,
          soldes: updatedSoldes
        },
        budgetPlanning: updatedBudgetPlanning
      };
      
      const success = await saveUserData(updatedUserData);
      
      if (success) {
        showToast('✓', 'success');
        
        // Marquer ce compte comme confirmé pour aujourd'hui (pour éviter le recalcul)
        markAccountAsConfirmedToday(newName);
      } else {
        showToast('⚠️ Erreur de sauvegarde', 'error');
      }
      
      setEditingAccount(null);
      setEditForm({ nom: '', solde: '', limite: '' });
      
      // Activer l'effet brillance sur le bouton GPS
      setGpsButtonGlow(true);
      setTimeout(() => setGpsButtonGlow(false), 3000);
    }
  };

  const handleCancelEdit = () => {
    setEditingAccount(null);
    setEditForm({ nom: '', solde: '', limite: '' });
  };

  // ========== AJOUT ==========
  
  const handleAddClick = () => {
    // 🔒 Vérifier la limite de comptes selon l'abonnement
    const currentAccountCount = userData?.accounts?.length || 0;
    if (!canAddMore('accounts', currentAccountCount)) {
      setUpgradeModal({ isOpen: true, type: 'accounts' });
      return;
    }
    
    setNewAccount({
      nom: '',
      type: 'cheque',
      institution: '',
      limite: '',
      solde: ''
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleSaveNewAccount = async () => {
    // Reset erreur
    setFormError('');
    
    if (!newAccount.nom.trim()) {
      setFormError(t('accounts.validation.nameRequired', 'Veuillez entrer un nom pour le compte'));
      return;
    }
    if (!newAccount.solde || isNaN(parseFloat(newAccount.solde))) {
      setFormError(t('accounts.validation.balanceRequired', 'Veuillez entrer un solde valide'));
      return;
    }
    if ((newAccount.type === 'credit' || newAccount.type === 'hypotheque') && !newAccount.limite) {
      setFormError(t('accounts.validation.limitRequired', 'Veuillez entrer la limite'));
      return;
    }

    const existingAccount = userData.accounts.find(a => a.nom.toLowerCase() === newAccount.nom.toLowerCase());
    if (existingAccount) {
      setFormError(t('accounts.validation.nameExists', 'Un compte avec ce nom existe déjà'));
      return;
    }

    const accountToAdd = {
      id: Date.now(),
      nom: newAccount.nom.trim(),
      type: newAccount.type,
      institution: newAccount.institution.trim(),
      limite: (newAccount.type === 'credit' || newAccount.type === 'hypotheque') ? newAccount.limite : ''
    };

    const updatedAccounts = [...userData.accounts, accountToAdd];
    const updatedSoldes = [
      ...userData.initialBalances.soldes,
      {
        accountName: newAccount.nom.trim(),
        accountType: newAccount.type,
        solde: newAccount.solde.toString()
      }
    ];

    const updatedUserData = {
      ...userData,
      accounts: updatedAccounts,
      initialBalances: {
        ...userData.initialBalances,
        soldes: updatedSoldes
      }
    };

    const success = await saveUserData(updatedUserData);
    
    if (success) {
      showToast('✓', 'success');
    } else {
      showToast('⚠️ Erreur lors de l\'ajout', 'error');
    }
    
    setShowAddModal(false);
    setNewAccount({
      nom: '',
      type: 'cheque',
      institution: '',
      limite: '',
      solde: ''
    });
  };

  const handleCancelAdd = () => {
    setFormError('');
    setShowAddModal(false);
  };

  // Supprimer un compte
  const handleDeleteClick = (account) => {
    setDeletingAccount(account);
  };

  const handleConfirmDelete = async () => {
    if (deletingAccount) {
      const accountName = deletingAccount.nom;
      const updatedAccounts = userData.accounts.filter(a => a.nom !== accountName);
      const updatedSoldes = userData.initialBalances.soldes.filter(s => s.accountName !== accountName);
      
      const updatedUserData = {
        ...userData,
        accounts: updatedAccounts,
        initialBalances: {
          ...userData.initialBalances,
          soldes: updatedSoldes
        }
      };
      
      const success = await saveUserData(updatedUserData);
      
      if (success) {
        showToast('✓ Supprimé', 'info');
      } else {
        showToast('⚠️ Erreur de suppression', 'error');
      }
      
      setDeletingAccount(null);
    }
  };

  const handleCancelDelete = () => {
    setDeletingAccount(null);
  };

  // ============================================
  // CALCUL DE allDayData (utilise le hook partagé)
  // ⚠️ IMPORTANT: Ce hook DOIT être appelé AVANT tout return conditionnel!
  // ============================================
  const accounts = userData?.accounts || [];
  const soldes = userData?.initialBalances?.soldes || [];
  
  const allDayData = useAllDayData({
    accounts,
    initialBalances: soldes,
    budgetEntrees: userData?.budgetPlanning?.entrees || [],
    budgetSorties: userData?.budgetPlanning?.sorties || [],
    budgetModifications: userData?.budgetPlanning?.modifications || [],
    daysToLoad: 365
  });
  
  // ============================================
  // LIMITE DE JOURS SELON LE PLAN D'ABONNEMENT
  // Discovery (gratuit): 90 jours, Essentiel+: 180 jours
  // ============================================
  const dayViewLimit = useMemo(() => {
    return currentPlan === 'discovery' ? 90 : 180;
  }, [currentPlan]);
  
  // Filtrer pour n'avoir que les jours avec activité (comme displayData dans GPSFinancier)
  const goDisplayData = useMemo(() => {
    // D'abord limiter les jours selon le plan, puis filtrer pour les jours avec activité
    const limitedData = allDayData.slice(0, dayViewLimit);
    return limitedData.filter(day => day.hasActivity || day.isToday);
  }, [allDayData, dayViewLimit]);
  
  // Déclencher l'animation de comptage lors du changement de jour en mode GO
  // ⚠️ Ce useEffect DOIT être avant tout return conditionnel
  useEffect(() => {
    if (isGoMode && goDisplayData.length > 0 && accounts.length > 0) {
      const prevIndex = prevGoDayIndexRef.current;
      const currentIndex = goDayIndex;
      
      // Seulement animer si l'index a changé
      if (prevIndex !== currentIndex) {
        accounts.forEach(account => {
          // Obtenir le solde précédent (du jour précédent dans goDisplayData)
          let fromValue = 0;
          if (prevIndex >= 0 && prevIndex < goDisplayData.length) {
            const prevDayData = goDisplayData[prevIndex];
            if (prevDayData?.accounts?.[account.nom]) {
              fromValue = prevDayData.accounts[account.nom].solde;
            }
          }
          
          // Obtenir le solde actuel
          let toValue = 0;
          if (currentIndex >= 0 && currentIndex < goDisplayData.length) {
            const currentDayData = goDisplayData[currentIndex];
            if (currentDayData?.accounts?.[account.nom]) {
              toValue = currentDayData.accounts[account.nom].solde;
            }
          }
          
          // Lancer l'animation seulement si les valeurs sont différentes
          if (fromValue !== toValue) {
            animateGoAccountValue(account.nom, fromValue, toValue);
          } else {
            // Mettre à jour directement sans animation
            setAnimatingGoAccounts(prev => ({
              ...prev,
              [account.nom]: toValue
            }));
          }
        });
      }
      
      prevGoDayIndexRef.current = currentIndex;
    }
  }, [isGoMode, goDayIndex, goDisplayData, accounts, animateGoAccountValue]);
  
  // Date formatée pour le mode GO (utilise goDisplayData)
  const goFormattedDate = goDisplayData[goDayIndex]?.label || formattedDate;
  
  // Fonction pour obtenir le solde d'un compte (mode normal)
  const getSoldeForAccount = (accountName) => {
    return soldes.find(s => s.accountName === accountName);
  };
  
  // Fonction pour obtenir le solde d'un compte en mode GO
  const getGoSoldeForAccount = (accountName) => {
    if (goDisplayData[goDayIndex]) {
      const dayData = goDisplayData[goDayIndex];
      if (dayData.accounts[accountName]) {
        return { accountName, solde: dayData.accounts[accountName].solde };
      }
    }
    return soldes.find(s => s.accountName === accountName);
  };

  // Si pas de données utilisateur du tout
  if (!userData || !userData.accounts) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: '1.2em', color: '#7f8c8d' }}>
          {t('accounts.noData')}
        </p>
      </div>
    );
  }

  const transactionsByAccount = getTransactionsByAccount();
  const hasUnconfirmedTransactions = Object.keys(transactionsByAccount).some(acc => !confirmedAccounts.has(acc));

  // Composant pour afficher un compte
  const AccountCircle = ({ account, soldeInfo, size = 145, isHighlighted = false, dataTooltip = null, isLocked = false }) => {
    const soldeValue = parseFloat(soldeInfo?.solde) || 0;
    const displayBalance = !balancesHidden;
    const isCredit = account.type === 'credit';
    
    // 🆕 Adapter la taille en fonction du nombre de chiffres
    const formattedAmount = formatMontant(soldeValue);
    const amountLength = formattedAmount.replace(/[^0-9]/g, '').length; // Compter seulement les chiffres
    
    // Ajustement dynamique: taille du cercle et de la police
    let adjustedSize = size;
    let fontSizeMultiplier = 1;
    
    if (amountLength >= 7) {
      // 1 000 000+ (7 chiffres)
      adjustedSize = size * 1.15;
      fontSizeMultiplier = 0.7;
    } else if (amountLength >= 6) {
      // 100 000+ (6 chiffres)
      adjustedSize = size * 1.1;
      fontSizeMultiplier = 0.8;
    } else if (amountLength >= 5) {
      // 10 000+ (5 chiffres)
      adjustedSize = size * 1.05;
      fontSizeMultiplier = 0.85;
    }
    
    const baseFontSize = size > 130 ? 1.5 : 1.2;
    const adjustedFontSize = baseFontSize * fontSizeMultiplier;
    
    // Couleur uniforme pour tous les comptes (orange/or brillant)
    const borderGradient = 'linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700)';
    const glowColor = 'rgba(255, 165, 0, 0.4)';

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        position: 'relative',
        filter: isLocked ? 'blur(4px)' : 'none',
        opacity: isLocked ? 0.6 : 1,
        pointerEvents: isLocked ? 'none' : 'auto'
      }}>
        {/* Badge verrou pour comptes verrouillés */}
        {isLocked && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100,
            filter: 'none',
            pointerEvents: 'auto',
            background: 'rgba(0,0,0,0.7)',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5em'
          }}>
            🔒
          </div>
        )}
        {/* Logo O avec emoji du compte */}
        <div
          {...(dataTooltip ? { 'data-tooltip': dataTooltip } : {})}
          style={{
            position: 'relative',
            width: `${adjustedSize}px`,
            height: `${adjustedSize}px`,
            cursor: 'pointer',
            transition: 'all 0.3s',
            transform: 'scale(1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {/* Bordure animée gradient - Orange/or pour tous les comptes */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '4px solid transparent',
            background: isDark 
              ? `linear-gradient(#040449, #100261) padding-box, ${borderGradient} border-box`
              : `linear-gradient(#ffffff, #ffffff) padding-box, ${borderGradient} border-box`,
            animation: isHighlighted 
              ? 'gps-ring-spin 3s linear infinite, pulse-highlight 1s ease-in-out infinite' 
              : 'gps-ring-spin 3s linear infinite',
            boxShadow: isHighlighted 
              ? `0 0 0 6px rgba(102, 126, 234, 0.5), 0 0 30px ${glowColor}`
              : `0 0 20px ${glowColor}`
          }} />
          
          {/* Contenu intérieur bleu foncé */}
          <div style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            right: '4px',
            bottom: '4px',
            borderRadius: '50%',
            background: isDark 
              ? 'linear-gradient(180deg, #040449 0%, #100261 100%)'
              : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '5px'
          }}>
            <div style={{ 
              fontSize: adjustedSize > 130 ? '1.8em' : '1.4em', 
              marginBottom: '2px',
              animation: isHighlighted ? 'logo-pulse 1s ease-in-out infinite' : 'none'
            }}>
              {getAccountIcon(account.type)}
            </div>
            <div style={{
              fontSize: `${adjustedFontSize}em`,
              fontWeight: 'bold',
              color: isCredit ? '#ffa500' : '#3498db',
              textAlign: 'center',
              textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              whiteSpace: 'nowrap'
            }}>
              {displayBalance ? formatMontant(soldeValue) : '••••••'}
            </div>
          </div>
        </div>

        {/* Nom du compte */}
        <div style={{
          fontSize: '0.85em',
          fontWeight: '600',
          color: isDark ? 'white' : '#1e293b',
          textAlign: 'center',
          maxWidth: '140px',
          textShadow: isDark ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
        }}>
          {account.nom}
        </div>

        {/* Type */}
        <div style={{
          fontSize: '0.7em',
          color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b',
          textAlign: 'center'
        }}>
          {getTypeLabel(account.type)}
        </div>

        {/* Boutons Modifier et Supprimer - cachés en mode GO */}
        {!isGoMode && (
          <div style={{
            display: 'flex',
            gap: '6px',
            alignItems: 'center'
          }}>
                        <button
              onClick={(e) => { e.stopPropagation(); handleEditClick(account, soldeInfo); }}
              title={t('common.edit')}
              style={{
                padding: '8px',
                background: 'white',
                border: '2px solid #ff9800',
                borderRadius: '50%',
                color: '#ff9800',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontSize: '0.9em',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#ff9800';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ✏️
            </button>
                        <button
              onClick={(e) => { e.stopPropagation(); handleDeleteClick(account); }}
              title={t('common.delete')}
              style={{
                padding: '8px',
                background: 'white',
                border: '2px solid #e74c3c',
                borderRadius: '50%',
                color: '#e74c3c',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontSize: '0.9em',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e74c3c';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#e74c3c';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    );
  };

  // Composant cercle "Ajouter"
  const AddAccountCircle = ({ size = 100 }) => (
    <div
      onClick={(e) => { e.stopPropagation(); handleAddClick(); }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer'
      }}
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          border: isDark ? '3px dashed rgba(102, 126, 234, 0.5)' : '3px dashed rgba(102, 126, 234, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s',
          background: isDark 
            ? 'linear-gradient(180deg, #040449 0%, #100261 100%)'
            : 'linear-gradient(180deg, rgba(102, 126, 234, 0.1) 0%, rgba(102, 126, 234, 0.2) 100%)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#4CAF50';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isDark ? 'rgba(102, 126, 234, 0.5)' : 'rgba(102, 126, 234, 0.4)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <span style={{ fontSize: '2em', color: isDark ? 'white' : '#667eea', fontWeight: 'bold' }}>+</span>
      </div>
      <div style={{
        fontSize: '0.8em',
        fontWeight: '600',
        color: isDark ? 'rgba(255,255,255,0.8)' : '#64748b',
        textAlign: 'center',
        textShadow: isDark ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
      }}>
        {t('accounts.addAccount')}
      </div>
    </div>
  );

  const accountCount = accounts.length;

  // Positions prédéfinies pour chaque configuration
  const getAccountPositions = (count) => {
    switch (count) {
      case 1:
        return [{ left: 35, top: 55 }];
      case 2:
        return [
          { left: 25, top: 55 },
          { left: 75, top: 55 }
        ];
      case 3:
        return [
          { left: 20, top: 60 },
          { left: 50, top: 25 },
          { left: 80, top: 60 }
        ];
      case 4:
        return [
          { left: 18, top: 60 },
          { left: 38, top: 30 },
          { left: 62, top: 30 },
          { left: 82, top: 60 }
        ];
      case 5:
        return [
          { left: 15, top: 65 },
          { left: 30, top: 35 },
          { left: 50, top: 22 },
          { left: 70, top: 35 },
          { left: 85, top: 65 }
        ];
      case 6:
        return [
          { left: 12, top: 65 },
          { left: 26, top: 42 },
          { left: 42, top: 25 },
          { left: 58, top: 25 },
          { left: 74, top: 42 },
          { left: 88, top: 65 }
        ];
      default:
        const positions = [];
        for (let i = 0; i < count; i++) {
          const angle = Math.PI - (i * Math.PI / (count - 1));
          const radius = 38;
          const centerX = 50;
          const centerY = 85;
          const left = centerX + radius * Math.cos(angle);
          const top = centerY - radius * Math.sin(angle) * 1.5;
          positions.push({ left, top: Math.max(20, top) });
        }
        return positions;
    }
  };

  const positions = getAccountPositions(accountCount);

  // Calcul du total des actifs et passifs
  const totalActifs = accounts
    .filter(a => a.type !== 'credit')
    .reduce((sum, a) => {
      const solde = soldes.find(s => s.accountName === a.nom);
      return sum + (parseFloat(solde?.solde) || 0);
    }, 0);
  
  const totalPassifs = accounts
    .filter(a => a.type === 'credit')
    .reduce((sum, a) => {
      const solde = soldes.find(s => s.accountName === a.nom);
      return sum + (parseFloat(solde?.solde) || 0);
    }, 0);
  
  const valeurNette = totalActifs - totalPassifs;

  // 📱 État pour le compte actif dans le snap scroll mobile
  const [activeAccountIndex, setActiveAccountIndex] = useState(0);
  const mobileScrollRef = useRef(null);
  
  // Détecter le compte visible lors du scroll
  useEffect(() => {
    const container = mobileScrollRef.current;
    if (!container || !isMobile) return;
    
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const itemHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / itemHeight);
      if (newIndex !== activeAccountIndex && newIndex >= 0 && newIndex <= accounts.length) {
        setActiveAccountIndex(newIndex);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isMobile, activeAccountIndex, accounts.length]);
  
  // Fonction pour scroller vers un compte spécifique
  const scrollToAccount = (index) => {
    const container = mobileScrollRef.current;
    if (!container) return;
    const itemHeight = container.clientHeight;
    container.scrollTo({ top: index * itemHeight, behavior: 'smooth' });
  };

  // 📱 Rendu mobile: Snap scroll vertical - un compte par écran
  const renderMobileContent = () => {
    const totalItems = accounts.length + (!isGoMode ? 1 : 0);
    
    return (
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        overflow: 'hidden' 
      }}>
        {/* Conteneur principal avec snap scroll */}
        <div 
          ref={mobileScrollRef}
          style={{
            height: '100%',
            overflowY: 'auto',
            scrollSnapType: 'y mandatory',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Chaque compte prend 100% de la hauteur visible */}
          {accounts.map((account, index) => {
            const soldeInfo = isGoMode ? getGoSoldeForAccount(account.nom) : getSoldeForAccount(account.nom);
            const soldeValue = isGoMode && animatingGoAccounts[account.nom] !== undefined
              ? animatingGoAccounts[account.nom]
              : parseFloat(soldeInfo?.solde) || 0;
            const isCredit = account.type === 'credit';
            const isLocked = index >= limits.maxAccounts;
            
            // Calcul taille police adaptative
            const getMobileFontSize = () => {
              const formatted = formatMontant(soldeValue);
              const digits = formatted.replace(/[^0-9]/g, '').length;
              if (digits >= 7) return '0.95em';
              if (digits >= 6) return '1.05em';
              if (digits >= 5) return '1.15em';
              return '1.3em';
            };
            
            return (
              <div 
                key={account.id || index}
                style={{
                  height: 'calc(100vh - 140px)',
                  minHeight: 'calc(100vh - 140px)',
                  scrollSnapAlign: 'start',
                  scrollSnapStop: 'always',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '15px',
                  position: 'relative',
                  filter: isLocked ? 'blur(4px)' : 'none',
                  opacity: isLocked ? 0.6 : 1
                }}
              >
                {/* Badge verrou */}
                {isLocked && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 100,
                    filter: 'none',
                    background: 'rgba(0,0,0,0.7)',
                    borderRadius: '50%',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8em'
                  }}>
                    🔒
                  </div>
                )}
                
                {/* ===== CONTENEUR AVEC DATE + PARE-BRISE ===== */}
                <div style={{
                  width: '100%',
                  maxWidth: '320px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  {/* 📅 DATE AU-DESSUS DU PARE-BRISE */}
                  <div style={{
                    background: 'rgba(255,255,255,0.95)',
                    padding: '8px 18px',
                    borderRadius: '20px',
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    marginBottom: '12px'
                  }}>
                    <span style={{ fontSize: '0.8em', fontWeight: '600', color: '#2c3e50' }}>
                      📅 {isGoMode ? goFormattedDate : formattedDate}
                    </span>
                  </div>
                  
                  {/* Demi-cercle HAUT */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '200px',
                    borderRadius: '300px 300px 0 0',
                    border: '3px solid transparent',
                    borderBottom: 'none',
                    background: isDark 
                      ? 'linear-gradient(180deg, rgba(26, 35, 126, 0.75) 0%, rgba(13, 17, 63, 0.85) 100%) padding-box, linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2), rgba(255,255,255,0.4), rgba(255,255,255,0.1)) border-box'
                      : 'linear-gradient(180deg, rgba(102, 126, 234, 0.08) 0%, rgba(102, 126, 234, 0.15) 100%) padding-box, linear-gradient(180deg, rgba(102, 126, 234, 0.4), rgba(102, 126, 234, 0.2), rgba(102, 126, 234, 0.3), rgba(102, 126, 234, 0.15)) border-box',
                    backdropFilter: 'blur(10px)',
                    boxShadow: isDark 
                      ? '0 -4px 20px rgba(0,0,0,0.2), inset 0 0 40px rgba(102, 126, 234, 0.1)'
                      : '0 -4px 20px rgba(102, 126, 234, 0.1), inset 0 0 40px rgba(102, 126, 234, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {/* Cercle du compte - taille réduite */}
                    <div style={{
                      position: 'relative',
                      width: '120px',
                      height: '120px'
                    }}>
                      <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: '4px solid transparent',
                        background: isDark 
                          ? 'linear-gradient(#040449, #100261) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box'
                          : 'linear-gradient(#ffffff, #ffffff) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box',
                        animation: 'gps-ring-spin 3s linear infinite',
                        boxShadow: '0 0 25px rgba(255, 165, 0, 0.5)'
                      }} />
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        right: '4px',
                        bottom: '4px',
                        borderRadius: '50%',
                        background: isDark 
                          ? 'linear-gradient(180deg, #040449 0%, #100261 100%)'
                          : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '5px'
                      }}>
                        <div style={{ fontSize: '1.6em', marginBottom: '2px' }}>
                          {getAccountIcon(account.type)}
                        </div>
                        <div style={{
                          fontSize: getMobileFontSize(),
                          fontWeight: 'bold',
                          color: isCredit ? '#ffa500' : '#3498db',
                          textAlign: 'center',
                          lineHeight: 1.1
                        }}>
                          {!balancesHidden ? formatMontant(soldeValue) : '••••••'}
                        </div>
                      </div>
                    </div>

                    {/* Nom et type */}
                    <div style={{
                      fontSize: '1.1em',
                      fontWeight: '600',
                      color: isDark ? 'white' : '#1e293b',
                      textAlign: 'center',
                      marginTop: '10px'
                    }}>
                      {account.nom}
                    </div>
                    <div style={{
                      fontSize: '0.85em',
                      color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b'
                    }}>
                      {getTypeLabel(account.type)}
                    </div>
                  </div>

                  {/* Demi-cercle BAS */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '80px',
                    borderRadius: '0 0 300px 300px',
                    border: '3px solid transparent',
                    borderTop: 'none',
                    marginTop: '-3px',
                    background: isDark 
                      ? 'linear-gradient(180deg, rgba(13, 17, 63, 0.85) 0%, rgba(26, 35, 126, 0.75) 100%) padding-box, linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.4), rgba(255,255,255,0.2), rgba(255,255,255,0.6)) border-box'
                      : 'linear-gradient(180deg, rgba(102, 126, 234, 0.15) 0%, rgba(102, 126, 234, 0.08) 100%) padding-box, linear-gradient(180deg, rgba(102, 126, 234, 0.15), rgba(102, 126, 234, 0.3), rgba(102, 126, 234, 0.2), rgba(102, 126, 234, 0.4)) border-box',
                    backdropFilter: 'blur(10px)',
                    boxShadow: isDark 
                      ? '0 4px 20px rgba(0,0,0,0.2)'
                      : '0 4px 20px rgba(102, 126, 234, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {/* Boutons Modifier/Supprimer */}
                    {!isGoMode && !isLocked && (
                      <div style={{
                        display: 'flex',
                        gap: '20px'
                      }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditClick(account, soldeInfo); }}
                          style={{
                            background: 'white',
                            border: '2px solid #ff9800',
                            borderRadius: '50%',
                            width: '44px',
                            height: '44px',
                            fontSize: '1.1em',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(account); }}
                          style={{
                            background: 'white',
                            border: '2px solid #e74c3c',
                            borderRadius: '50%',
                            width: '44px',
                            height: '44px',
                            fontSize: '1.1em',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Page "Ajouter un compte" */}
          {!isGoMode && (
            <div style={{
              height: 'calc(100vh - 140px)',
              minHeight: 'calc(100vh - 140px)',
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '15px'
            }}>
              <div style={{
                width: '100%',
                maxWidth: '320px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                {/* Demi-cercle HAUT dashed */}
                <div 
                  onClick={handleAddClick}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '180px',
                    borderRadius: '300px 300px 0 0',
                    border: '3px dashed rgba(102, 126, 234, 0.4)',
                    borderBottom: 'none',
                    background: isDark 
                      ? 'linear-gradient(180deg, rgba(26, 35, 126, 0.4) 0%, rgba(13, 17, 63, 0.5) 100%)'
                      : 'linear-gradient(180deg, rgba(102, 126, 234, 0.05) 0%, rgba(102, 126, 234, 0.1) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    border: '3px dashed rgba(102, 126, 234, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isDark 
                      ? 'linear-gradient(180deg, #040449 0%, #100261 100%)'
                      : 'linear-gradient(180deg, rgba(102, 126, 234, 0.1) 0%, rgba(102, 126, 234, 0.2) 100%)'
                  }}>
                    <span style={{ fontSize: '2.5em', color: isDark ? 'white' : '#667eea', fontWeight: 'bold' }}>+</span>
                  </div>
                  <div style={{
                    fontSize: '1em',
                    fontWeight: '600',
                    color: isDark ? 'rgba(255,255,255,0.8)' : '#64748b',
                    marginTop: '12px'
                  }}>
                    {t('accounts.addAccount')}
                  </div>
                </div>

                {/* Demi-cercle BAS dashed */}
                <div 
                  onClick={handleAddClick}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '70px',
                    borderRadius: '0 0 300px 300px',
                    border: '3px dashed rgba(102, 126, 234, 0.4)',
                    borderTop: 'none',
                    marginTop: '-3px',
                    background: isDark 
                      ? 'linear-gradient(180deg, rgba(13, 17, 63, 0.5) 0%, rgba(26, 35, 126, 0.4) 100%)'
                      : 'linear-gradient(180deg, rgba(102, 126, 234, 0.1) 0%, rgba(102, 126, 234, 0.05) 100%)',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Indicateurs de pagination (dots) */}
        <div style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 10
        }}>
          {Array.from({ length: totalItems }).map((_, index) => (
            <div
              key={index}
              onClick={() => scrollToAccount(index)}
              style={{
                width: activeAccountIndex === index ? '12px' : '8px',
                height: activeAccountIndex === index ? '12px' : '8px',
                borderRadius: '50%',
                background: activeAccountIndex === index 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: activeAccountIndex === index ? '0 0 8px rgba(102, 126, 234, 0.5)' : 'none'
              }}
            />
          ))}
        </div>

        {/* 📱 Boutons flottants en haut à droite */}
        {!isGoMode && (
          <div style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'flex-end',
            zIndex: 20
          }}>
            {/* Bouton + Ajouter un compte */}
            <button
              onClick={(e) => { e.stopPropagation(); handleAddClick(); }}
              style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                border: 'none',
                borderRadius: '25px',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.85em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)',
                whiteSpace: 'nowrap'
              }}
            >
              <span>➕</span>
              <span>{t('accounts.addAccount')}</span>
            </button>
          </div>
        )}

        {/* Indicateur de scroll */}
        {accounts.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: activeAccountIndex < totalItems - 1 ? 0.6 : 0,
            transition: 'opacity 0.3s',
            pointerEvents: 'none'
          }}>
            <span style={{ fontSize: '0.75em', color: isDark ? 'white' : '#64748b', marginBottom: '4px' }}>
              Swipe
            </span>
            <span style={{ fontSize: '1.2em' }}>↓</span>
          </div>
        )}
      </div>
    );
  };

  // Contenu de la plateforme (réutilisé en mode normal et plein écran)
  const renderPlatformContent = () => (
    <>
      {/* ===== DEMI-CERCLE HAUT (Pare-brise) ===== */}
      <div style={{
        position: 'absolute',
        top: isFullScreen ? '80px' : '85px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: isFullScreen ? '90%' : '95%',
        maxWidth: isFullScreen ? '1300px' : '1150px',
        height: isFullScreen ? '480px' : '380px',
        borderRadius: '575px 575px 0 0',
        border: '3px solid transparent',
        borderBottom: 'none',
        background: isDark 
          ? 'linear-gradient(180deg, rgba(26, 35, 126, 0.75) 0%, rgba(13, 17, 63, 0.85) 100%) padding-box, linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2), rgba(255,255,255,0.4), rgba(255,255,255,0.1)) border-box'
          : 'linear-gradient(180deg, rgba(102, 126, 234, 0.08) 0%, rgba(102, 126, 234, 0.15) 100%) padding-box, linear-gradient(180deg, rgba(102, 126, 234, 0.4), rgba(102, 126, 234, 0.2), rgba(102, 126, 234, 0.3), rgba(102, 126, 234, 0.15)) border-box',
        backdropFilter: 'blur(10px)',
        boxShadow: isDark 
          ? '0 -4px 30px rgba(0,0,0,0.2), inset 0 0 60px rgba(102, 126, 234, 0.1), 0 0 20px rgba(255,255,255,0.1)'
          : '0 -4px 30px rgba(102, 126, 234, 0.1), inset 0 0 60px rgba(102, 126, 234, 0.05), 0 0 20px rgba(102, 126, 234, 0.08)',
        transition: 'all 0.3s ease'
      }}>
        {/* Ligne de route décorative avec DATE */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '10%',
          right: '10%',
          height: '2px',
          background: isDark 
            ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.3), transparent)',
          borderRadius: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Date du jour au centre de la ligne */}
          <div style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            {/* Badge de date */}
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              padding: '8px 20px',
              borderRadius: '20px',
              border: '2px solid rgba(102, 126, 234, 0.3)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
            }}>
              <span style={{
                fontSize: '0.9em',
                fontWeight: '600',
                color: '#2c3e50',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '1.1em' }}>📅</span>
                {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* ===== AFFICHAGE DES COMPTES ===== */}
        
        {/* 0 compte */}
        {accountCount === 0 && !isGoMode && (
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}>
            <AddAccountCircle size={140} />
          </div>
        )}

        {/* 1 compte */}
        {accountCount === 1 && (
          <>
            <div 
              style={{
              position: 'absolute',
              left: '35%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}>
              <AccountCircle 
                account={accounts[0]} 
                soldeInfo={getSoldeForAccount(accounts[0].nom)}
                size={isFullScreen ? 160 : 150}
                isHighlighted={highlightedAccount === accounts[0].nom}
                dataTooltip="account-card"
              />
            </div>
            {!isGoMode && (
              <div style={{
                position: 'absolute',
                left: '65%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}>
                <AddAccountCircle size={isFullScreen ? 130 : 120} />
              </div>
            )}
            {/* Message d'encouragement - SOUS la date */}
            <div style={{
              position: 'absolute',
              bottom: '-55px',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              color: '#7f8c8d',
              fontSize: '0.85em',
              background: 'rgba(255,255,255,0.95)',
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px dashed #bdc3c7',
              zIndex: 5,
              whiteSpace: 'nowrap'
            }}>
              💡 {t('accounts.tipAddMore') || 'Ajoutez vos autres comptes pour une vue complète!'}
            </div>
          </>
        )}

        {/* 2+ comptes */}
        {accountCount >= 2 && accounts.map((account, index) => {
          const pos = positions[index];
          if (!pos) return null;
          
          return (
            <div 
              key={account.id || index}
              style={{
                position: 'absolute',
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <AccountCircle 
                account={account} 
                soldeInfo={getSoldeForAccount(account.nom)}
                size={isFullScreen 
                  ? (accountCount <= 3 ? 160 : (accountCount <= 5 ? 145 : 125))
                  : (accountCount <= 3 ? 145 : (accountCount <= 5 ? 125 : 110))
                }
                isHighlighted={highlightedAccount === account.nom}
                dataTooltip={index === 0 ? 'account-card' : null}
                isLocked={index >= limits.maxAccounts}
              />
            </div>
          );
        })}
      </div>

      {/* ===== DEMI-CERCLE BAS ===== */}
      {accountCount >= 2 && (
        <div style={{
          position: 'absolute',
          top: isFullScreen ? 'calc(80px + 480px - 4px)' : 'calc(85px + 380px - 4px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: isFullScreen ? '90%' : '95%',
          maxWidth: isFullScreen ? '1300px' : '1150px',
          height: isFullScreen ? '180px' : '160px',
          borderRadius: '0 0 575px 575px',
          border: '3px solid transparent',
          borderTop: 'none',
          background: isDark 
            ? 'linear-gradient(180deg, rgba(13, 17, 63, 0.85) 0%, rgba(26, 35, 126, 0.75) 100%) padding-box, linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.4), rgba(255,255,255,0.2), rgba(255,255,255,0.6)) border-box'
            : 'linear-gradient(180deg, rgba(102, 126, 234, 0.15) 0%, rgba(102, 126, 234, 0.08) 100%) padding-box, linear-gradient(180deg, rgba(102, 126, 234, 0.15), rgba(102, 126, 234, 0.3), rgba(102, 126, 234, 0.2), rgba(102, 126, 234, 0.4)) border-box',
          backdropFilter: 'blur(10px)',
          boxShadow: isDark 
            ? '0 4px 30px rgba(0,0,0,0.2), inset 0 0 60px rgba(102, 126, 234, 0.1), 0 0 20px rgba(255,255,255,0.1)'
            : '0 4px 30px rgba(102, 126, 234, 0.1), inset 0 0 60px rgba(102, 126, 234, 0.05), 0 0 20px rgba(102, 126, 234, 0.08)',
          transition: 'all 0.3s ease'
        }}>
          {/* Ligne de route décorative */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '10%',
            right: '10%',
            height: '2px',
            background: isDark 
              ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.3), transparent)',
            borderRadius: '2px'
          }} />

          {/* Bouton Ajouter au centre - caché en mode GO */}
          {!isGoMode && (
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '55%',
              transform: 'translate(-50%, -50%)'
            }}>
              <AddAccountCircle size={isFullScreen ? 110 : 100} />
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Animation CSS pour le highlight et la brillance */}
      <style>
        {`
          @keyframes pulse-highlight {
            0%, 100% {
              box-shadow: 0 0 0 6px rgba(102, 126, 234, 0.5), 0 0 30px rgba(102, 126, 234, 0.4);
            }
            50% {
              box-shadow: 0 0 0 12px rgba(102, 126, 234, 0.3), 0 0 50px rgba(102, 126, 234, 0.6);
            }
          }
          
          @keyframes logo-pulse {
            0%, 100% {
              transform: scale(1);
              filter: drop-shadow(0 0 0 transparent);
            }
            50% {
              transform: scale(1.3);
              filter: drop-shadow(0 0 15px rgba(102, 126, 234, 0.8));
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
          
          @keyframes gps-glow {
            0%, 100% {
              box-shadow: 0 6px 25px rgba(102, 126, 234, 0.4), 0 0 0 0 rgba(102, 126, 234, 0);
            }
            50% {
              box-shadow: 0 6px 35px rgba(102, 126, 234, 0.8), 0 0 30px 10px rgba(102, 126, 234, 0.4);
            }
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
          
          @keyframes solde-slide-up {
            0% {
              opacity: 0;
              transform: translateY(15px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes solde-slide-down {
            0% {
              opacity: 0;
              transform: translateY(-15px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes solde-pop {
            0% {
              transform: scale(0.8);
              opacity: 0.5;
            }
            50% {
              transform: scale(1.15);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
          
          @keyframes solde-blur {
            0% {
              filter: blur(8px);
              opacity: 0.3;
            }
            100% {
              filter: blur(0);
              opacity: 1;
            }
          }
          
          @keyframes solde-glow {
            0% {
              text-shadow: 0 0 0 transparent;
              opacity: 0.5;
            }
            50% {
              text-shadow: 0 0 20px rgba(255,255,255,0.9), 0 0 40px rgba(255,215,0,0.6);
            }
            100% {
              text-shadow: 0 1px 3px rgba(0,0,0,0.2);
              opacity: 1;
            }
          }
          
          @keyframes solde-flip {
            0% {
              transform: rotateX(90deg);
              opacity: 0;
            }
            100% {
              transform: rotateX(0deg);
              opacity: 1;
            }
          }
          
          @keyframes solde-bounce {
            0% {
              transform: scale(0.3);
              opacity: 0;
            }
            50% {
              transform: scale(1.1);
            }
            70% {
              transform: scale(0.9);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
          
          @keyframes float-arrow {
            0%, 100% {
              transform: translateY(0);
              opacity: 0.9;
            }
            50% {
              transform: translateY(-8px);
              opacity: 1;
            }
          }
          
          /* ===== SCROLLBAR GPS NÉON (Global pour le mode GO) ===== */
          .go-mode-container ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          
          .go-mode-container ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
          }
          
          .go-mode-container ::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #ffa500, #ff6b00);
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(255, 165, 0, 0.6), 0 0 20px rgba(255, 165, 0, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.1);
          }
          
          .go-mode-container ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #ffb732, #ff8533);
            box-shadow: 0 0 15px rgba(255, 165, 0, 0.8), 0 0 30px rgba(255, 165, 0, 0.5);
          }
          
          .go-mode-container ::-webkit-scrollbar-corner {
            background: transparent;
          }
          
          /* Firefox scrollbar */
          .go-mode-container * {
            scrollbar-width: thin;
            scrollbar-color: #ffa500 rgba(255, 255, 255, 0.05);
          }
          
          /* ===== PLACEHOLDER ITALIQUE POUR LES FORMULAIRES ===== */
          input::placeholder {
            font-style: italic;
            opacity: 0.6;
          }
        `}
      </style>
    
    {/* WRAPPER AVEC FOND BLEU FONCÉ pour le coin arrondi */}
    <div style={{
      height: '100%',
      background: isDark 
        ? 'linear-gradient(180deg, #040449 0%, #100261 100%)'
        : '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'background 0.3s ease'
    }}>
      {/* ZONE DE NOTIFICATIONS - Barre "On continue" ou espace réservé */}
      <div style={{
        background: showContinueBar 
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : (isDark ? 'transparent' : '#ffffff'),
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
      
      {/* CONTENEUR pour le reste du contenu */}
      <div style={{
        flex: 1,
        background: 'transparent',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
      {/* Overlay transparent pour capturer tous les clics en mode normal */}
      {/* Désactivé pendant le tooltip tour pour permettre le highlight */}
      {!isFullScreen && !isTooltipActive && (
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
      {/* Badge notification transactions du jour */}
      {todayTransactions.length > 0 && !isFullScreen && (
        <div style={{
          position: 'fixed',
          bottom: '110px',
          right: '30px',
          zIndex: 100
        }}>
          <button
            onClick={() => setIsFullScreen(true)}
            style={{
              padding: '12px 20px',
              background: hasUnconfirmedTransactions 
                ? 'linear-gradient(135deg, #f39c12 0%, #ffa500 100%)'
                : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
              border: 'none',
              borderRadius: '50px',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.9em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: hasUnconfirmedTransactions 
                ? '0 4px 20px rgba(243, 156, 18, 0.4)'
                : '0 4px 20px rgba(39, 174, 96, 0.4)',
              transition: 'all 0.3s',
              animation: hasUnconfirmedTransactions ? 'pulse-highlight 2s infinite' : 'none'
            }}
          >
            <span>{hasUnconfirmedTransactions ? '🔔' : '✓'}</span>
            <span>{todayTransactions.length} transaction{todayTransactions.length > 1 ? 's' : ''} aujourd'hui</span>
          </button>
        </div>
      )}

      {/* ===== PLATEFORME PRINCIPALE (Cliquable pour afficher soldes puis plein écran) ===== */}
      <div 
        onClick={handleWindshieldClick}
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          background: isDark 
            ? 'linear-gradient(180deg, #040449 0%, #100261 100%)'
            : '#ffffff',
          overflow: 'hidden',
          cursor: 'pointer',
          padding: '20px',
          transition: 'background 0.3s ease'
        }}
      >
        {/* Header avec titre */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          position: 'relative',
          zIndex: 600
        }}>
          <h1 style={{ 
            fontSize: '1.8em', 
            fontWeight: 'bold', 
            color: isDark ? 'white' : '#1e293b', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            margin: 0 
          }}>
            💼 {t('accounts.title')}
          </h1>
          
          {/* Bouton Ajouter + Bouton Œil */}
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            {!isGoMode && (
              <button
                data-tooltip="add-account"
                onClick={(e) => { e.stopPropagation(); handleAddClick(); }}
                style={{
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.9em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                  transition: 'all 0.3s',
                  position: 'relative',
                  zIndex: 600
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
                }}
              >
                <span>➕</span>
                <span>{t('accounts.addAccount')}</span>
              </button>
            )}
            

          </div>
        </div>

        {renderPlatformContent()}
      </div>

      {/* ===== MODE PLEIN ÉCRAN ===== */}
      {isFullScreen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isDark 
              ? 'linear-gradient(180deg, #040449 0%, #100261 100%)'
              : '#ffffff',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'background 0.3s ease'
          }}
        >
          {/* Header plein écran */}
          <div style={{ 
            padding: isMobile ? '10px 15px' : '15px 30px',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'transparent',
            flexShrink: 0
          }}>
            {/* Titre - à gauche */}
            <h1 style={{ 
              fontSize: isMobile ? '1.1em' : '1.8em', 
              fontWeight: 'bold', 
              color: isDark ? 'white' : '#1e293b', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              margin: 0
            }}>
              💼 {t('accounts.title')}
            </h1>
            
            {/* Boutons à droite */}
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
                  width: isMobile ? '32px' : '40px',
                  height: isMobile ? '32px' : '40px',
                  borderRadius: '50%',
                  border: isDark ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(0,0,0,0.2)',
                  background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  color: isDark ? 'white' : '#64748b',
                  fontSize: isMobile ? '1em' : '1.2em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e74c3c';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = '#e74c3c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
                  e.currentTarget.style.color = isDark ? 'white' : '#64748b';
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
                }}
              >
                ✕
              </button>
              
              {/* Bouton Œil */}
              <button
                onClick={toggleBalances}
                title={balancesHidden ? "Afficher les soldes" : "Masquer les soldes"}
                style={{
                  width: isMobile ? '32px' : '40px',
                  height: isMobile ? '32px' : '40px',
                  borderRadius: '50%',
                  border: balancesHidden 
                    ? 'none' 
                    : (isDark ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(0,0,0,0.2)'),
                  background: balancesHidden 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                  color: balancesHidden ? 'white' : (isDark ? 'white' : '#64748b'),
                  fontSize: isMobile ? '1em' : '1.2em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s',
                  boxShadow: balancesHidden ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none'
                }}
              >
                {balancesHidden ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>

          {/* Contenu plein écran */}
          <div 
            style={{ flex: 1, position: 'relative', overflow: isMobile ? 'auto' : 'hidden' }}
          >
            {/* Bouton Ajouter + Bouton Œil sur la plateforme (plein écran) - DESKTOP ONLY */}
            {!isMobile && (
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '40px',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                alignItems: 'flex-end'
              }}>
                {!isGoMode && (
                  <button
                    data-tooltip="add-account"
                    onClick={(e) => { e.stopPropagation(); handleAddClick(); }}
                    style={{
                      padding: '10px 18px',
                      background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.9em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
                    }}
                  >
                    <span>➕</span>
                    <span>{t('accounts.addAccount')}</span>
                  </button>
                )}
              </div>
            )}
            
            {/* Affichage mobile ou desktop */}
            {isMobile ? renderMobileContent() : renderPlatformContent()}
          </div>

        </div>
      )}
      </div>
    </div>

      {/* Modal de guide utilisateur */}
      <PageGuideModal 
        isOpen={showGuide}
        onClose={closeModal}
        page="comptes"
      />
      
      {/* Tour de tooltips interactif */}
      <TooltipTour
        isActive={isTooltipActive}
        currentStep={tooltipStep}
        totalSteps={tooltipTotal}
        tooltip={currentTooltip}
        onNext={nextTooltip}
        onPrev={prevTooltip}
        onSkip={skipTooltips}
      />
      
      {/* Toast notifications */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast}
        />
      )}

      {/* Modal d'upgrade (restrictions abonnement) */}
      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ isOpen: false, type: null })}
        featureType={upgradeModal.type}
      />

      {/* ===== MODAL DE MODIFICATION ===== */}
      {editingAccount && (
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
          padding: '20px'
        }}>
          <div style={{
            background: isDark ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' : 'white',
            borderRadius: '20px',
            padding: '30px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'modal-appear 0.3s ease-out'
          }}>
            <h2 style={{ 
              margin: '0 0 25px 0', 
              color: isDark ? 'white' : '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              ✏️ {t('accounts.editAccount')}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Nom */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: isDark ? 'rgba(255,255,255,0.9)' : '#374151'
                }}>
                  {t('accounts.form.name')}
                </label>
                <input
                  type="text"
                  value={editForm.nom}
                  onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '1em',
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'white',
                    color: isDark ? 'white' : '#1e293b',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Solde */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: isDark ? 'rgba(255,255,255,0.9)' : '#374151'
                }}>
                  {editingAccount.type === 'credit' ? t('accounts.form.balance') : t('accounts.form.balance')}
                </label>
                <div 
                  onClick={() => setShowNumpadModal(true)}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '1.2em',
                    fontWeight: 'bold',
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'white',
                    color: editingAccount.type === 'credit' ? '#ffa500' : '#3498db',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{formatMontant(parseFloat(editForm.solde) || 0)}</span>
                  <span style={{ fontSize: '0.8em', opacity: 0.6 }}>⌨️</span>
                </div>
              </div>

              {/* Limite (pour crédit uniquement) */}
              {editingAccount.type === 'credit' && (
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: isDark ? 'rgba(255,255,255,0.9)' : '#374151'
                  }}>
                    {t('accounts.form.limit')}
                  </label>
                  <div 
                    onClick={() => setShowEditLimiteNumpadModal(true)}
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontSize: '1.2em',
                      fontWeight: 'bold',
                      background: isDark ? 'rgba(255,255,255,0.1)' : 'white',
                      color: '#e74c3c',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{formatMontant(parseFloat(editForm.limite) || 0)}</span>
                    <span style={{ fontSize: '0.8em', opacity: 0.6 }}>⌨️</span>
                  </div>
                </div>
              )}
            </div>

            {/* Boutons */}
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              marginTop: '30px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleCancelEdit}
                style={{
                  padding: '12px 25px',
                  background: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
                  border: 'none',
                  borderRadius: '10px',
                  color: isDark ? 'white' : '#374151',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  padding: '12px 25px',
                  background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                  transition: 'all 0.3s'
                }}
              >
                ✓ {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* NumpadModal pour modification du solde */}
      <NumpadModal
        isOpen={showNumpadModal}
        onClose={() => setShowNumpadModal(false)}
        onConfirm={(value) => {
          setEditForm({ ...editForm, solde: value.toString() });
          setShowNumpadModal(false);
        }}
        initialValue={editForm.solde}
        title={t('accounts.form.enterBalance')}
        allowNegative={false}
      />
      
      {/* NumpadModal pour modification de la limite */}
      <NumpadModal
        isOpen={showEditLimiteNumpadModal}
        onClose={() => setShowEditLimiteNumpadModal(false)}
        onConfirm={(value) => {
          setEditForm({ ...editForm, limite: value.toString() });
          setShowEditLimiteNumpadModal(false);
        }}
        initialValue={editForm.limite}
        title={t('accounts.form.enterLimit')}
        allowNegative={false}
      />

      {/* ===== MODAL D'AJOUT ===== */}
      {showAddModal && (
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
          padding: '20px'
        }}>
          <div style={{
            background: isDark ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' : 'white',
            borderRadius: '20px',
            padding: '30px',
            width: '100%',
            maxWidth: '450px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'modal-appear 0.3s ease-out'
          }}>
            <h2 style={{ 
              margin: '0 0 25px 0', 
              color: isDark ? 'white' : '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              ➕ {t('accounts.addNewAccount')}
            </h2>

            {/* Message d'erreur */}
            {formError && (
              <div style={{
                background: 'rgba(231, 76, 60, 0.1)',
                border: '1px solid #e74c3c',
                borderRadius: '10px',
                padding: '12px 15px',
                marginBottom: '20px',
                color: '#e74c3c',
                fontSize: '0.9em'
              }}>
                ⚠️ {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Type de compte */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: isDark ? 'rgba(255,255,255,0.9)' : '#374151'
                }}>
                  {t('accounts.form.type')}
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['cheque', 'epargne', 'credit', 'hypotheque'].map(type => (
                    <button
                      key={type}
                      onClick={() => setNewAccount({ ...newAccount, type, limite: (type === 'credit' || type === 'hypotheque') ? newAccount.limite : '' })}
                      style={{
                        padding: '10px 15px',
                        background: newAccount.type === type 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : (isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6'),
                        border: 'none',
                        borderRadius: '10px',
                        color: newAccount.type === type ? 'white' : (isDark ? 'rgba(255,255,255,0.8)' : '#374151'),
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.3s'
                      }}
                    >
                      {getAccountIcon(type)} {getTypeLabel(type)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nom */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: isDark ? 'rgba(255,255,255,0.9)' : '#374151'
                }}>
                  {t('accounts.form.name')} *
                </label>
                <input
                  type="text"
                  value={newAccount.nom}
                  onChange={(e) => setNewAccount({ ...newAccount, nom: e.target.value })}
                  placeholder={t('accounts.form.namePlaceholder')}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '1em',
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'white',
                    color: isDark ? 'white' : '#1e293b',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Institution */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: isDark ? 'rgba(255,255,255,0.9)' : '#374151'
                }}>
                  {t('accounts.form.institution')}
                </label>
                <input
                  type="text"
                  value={newAccount.institution}
                  onChange={(e) => setNewAccount({ ...newAccount, institution: e.target.value })}
                  placeholder={t('accounts.form.institutionPlaceholder')}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '1em',
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'white',
                    color: isDark ? 'white' : '#1e293b',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Solde initial */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: isDark ? 'rgba(255,255,255,0.9)' : '#374151'
                }}>
                  {newAccount.type === 'credit' ? t('accounts.form.currentBalance') : t('accounts.form.initialBalance')} *
                </label>
                <div 
                  onClick={() => setShowAddNumpadModal(true)}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '1.2em',
                    fontWeight: 'bold',
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'white',
                    color: newAccount.type === 'credit' ? '#ffa500' : '#3498db',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{newAccount.solde ? formatMontant(parseFloat(newAccount.solde)) : t('accounts.form.tapToEnter')}</span>
                  <span style={{ fontSize: '0.8em', opacity: 0.6 }}>⌨️</span>
                </div>
              </div>

              {/* Limite (pour crédit) */}
              {(newAccount.type === 'credit' || newAccount.type === 'hypotheque') && (
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: isDark ? 'rgba(255,255,255,0.9)' : '#374151'
                  }}>
                    {t('accounts.form.creditLimit')} *
                  </label>
                  <div 
                    onClick={() => setShowAddLimiteNumpadModal(true)}
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontSize: '1.2em',
                      fontWeight: 'bold',
                      background: isDark ? 'rgba(255,255,255,0.1)' : 'white',
                      color: '#e74c3c',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{newAccount.limite ? formatMontant(parseFloat(newAccount.limite)) : t('accounts.form.tapToEnter')}</span>
                    <span style={{ fontSize: '0.8em', opacity: 0.6 }}>⌨️</span>
                  </div>
                </div>
              )}
            </div>

            {/* Boutons */}
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              marginTop: '30px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleCancelAdd}
                style={{
                  padding: '12px 25px',
                  background: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
                  border: 'none',
                  borderRadius: '10px',
                  color: isDark ? 'white' : '#374151',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveNewAccount}
                style={{
                  padding: '12px 25px',
                  background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                  transition: 'all 0.3s'
                }}
              >
                ✓ {t('accounts.addAccount')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* NumpadModal pour ajout - solde initial */}
      <NumpadModal
        isOpen={showAddNumpadModal}
        onClose={() => setShowAddNumpadModal(false)}
        onConfirm={(value) => {
          setNewAccount({ ...newAccount, solde: value.toString() });
          setShowAddNumpadModal(false);
        }}
        initialValue={newAccount.solde}
        title={newAccount.type === 'credit' ? t('accounts.form.enterCurrentBalance') : t('accounts.form.enterInitialBalance')}
        allowNegative={false}
      />
      
      {/* NumpadModal pour ajout - limite de crédit */}
      <NumpadModal
        isOpen={showAddLimiteNumpadModal}
        onClose={() => setShowAddLimiteNumpadModal(false)}
        onConfirm={(value) => {
          setNewAccount({ ...newAccount, limite: value.toString() });
          setShowAddLimiteNumpadModal(false);
        }}
        initialValue={newAccount.limite}
        title={t('accounts.form.enterCreditLimit')}
        allowNegative={false}
      />

      {/* ===== MODAL DE SUPPRESSION ===== */}
      {deletingAccount && (
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
          padding: '20px'
        }}>
          <div style={{
            background: isDark ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' : 'white',
            borderRadius: '20px',
            padding: '30px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'modal-appear 0.3s ease-out',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3em', marginBottom: '20px' }}>🗑️</div>
            <h2 style={{ 
              margin: '0 0 15px 0', 
              color: isDark ? 'white' : '#1e293b'
            }}>
              {t('accounts.confirmDelete')}
            </h2>
            <p style={{ 
              color: isDark ? 'rgba(255,255,255,0.7)' : '#6b7280',
              marginBottom: '25px'
            }}>
              {t('accounts.deleteWarning', { name: deletingAccount.nom })}
            </p>

            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              justifyContent: 'center'
            }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  padding: '12px 25px',
                  background: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
                  border: 'none',
                  borderRadius: '10px',
                  color: isDark ? 'white' : '#374151',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '12px 25px',
                  background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)',
                  transition: 'all 0.3s'
                }}
              >
                🗑️ {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL CONFIRMATION TRANSACTIONS DU JOUR ===== */}
      {showTransactionConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            background: isDark ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' : 'white',
            borderRadius: '20px',
            padding: '30px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'modal-appear 0.3s ease-out'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>📅</div>
              <h2 style={{ 
                margin: '0 0 10px 0', 
                color: isDark ? 'white' : '#1e293b'
              }}>
                {t('accounts.transactionsToday')}
              </h2>
              <p style={{ 
                color: isDark ? 'rgba(255,255,255,0.7)' : '#6b7280',
                margin: 0
              }}>
                {formattedDate}
              </p>
            </div>

            {/* Liste des transactions par compte */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Object.entries(transactionsByAccount).map(([accountName, data]) => {
                const account = accounts.find(a => a.nom === accountName);
                const isConfirmed = confirmedAccounts.has(accountName);
                
                return (
                  <div 
                    key={accountName}
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                      borderRadius: '15px',
                      padding: '20px',
                      border: isConfirmed 
                        ? '2px solid #27ae60' 
                        : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb'),
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '15px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5em' }}>{account ? getAccountIcon(account.type) : '💳'}</span>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: isDark ? 'white' : '#1e293b'
                        }}>
                          {accountName}
                        </span>
                      </div>
                      {isConfirmed && (
                        <span style={{ color: '#27ae60', fontSize: '1.5em' }}>✓</span>
                      )}
                    </div>

                    {/* Entrées */}
                    {data.entrees.map((t, idx) => (
                      <div 
                        key={`e-${idx}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb'
                        }}
                      >
                        <span style={{ color: isDark ? 'rgba(255,255,255,0.8)' : '#374151' }}>
                          ⬆️ {t.description}
                        </span>
                        <span style={{ color: '#27ae60', fontWeight: 'bold' }}>
                          +{formatMontant(t.montant)}
                        </span>
                      </div>
                    ))}

                    {/* Sorties */}
                    {data.sorties.map((t, idx) => (
                      <div 
                        key={`s-${idx}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb'
                        }}
                      >
                        <span style={{ color: isDark ? 'rgba(255,255,255,0.8)' : '#374151' }}>
                          ⬇️ {t.description}
                        </span>
                        <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                          -{formatMontant(t.montant)}
                        </span>
                      </div>
                    ))}

                    {/* Total et bouton confirmer */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginTop: '15px',
                      paddingTop: '10px'
                    }}>
                      <div>
                        <span style={{ 
                          color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280',
                          fontSize: '0.85em'
                        }}>
                          {t('accounts.netChange')}:
                        </span>
                        <span style={{ 
                          marginLeft: '10px',
                          fontWeight: 'bold',
                          color: (data.totalEntrees - data.totalSorties) >= 0 ? '#27ae60' : '#e74c3c'
                        }}>
                          {(data.totalEntrees - data.totalSorties) >= 0 ? '+' : ''}
                          {formatMontant(data.totalEntrees - data.totalSorties)}
                        </span>
                      </div>
                      {!isConfirmed && (
                        <button
                          onClick={() => handleConfirmAccount(accountName)}
                          style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '0.85em',
                            cursor: 'pointer'
                          }}
                        >
                          ✓ {t('common.confirm')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Boutons du modal */}
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              marginTop: '25px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              {hasUnconfirmedTransactions && (
                <button
                  onClick={handleConfirmAll}
                  style={{
                    padding: '12px 25px',
                    background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)'
                  }}
                >
                  ✓ {t('accounts.confirmAll')}
                </button>
              )}
              <button
                onClick={handleCloseConfirmModal}
                style={{
                  padding: '12px 25px',
                  background: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
                  border: 'none',
                  borderRadius: '10px',
                  color: isDark ? 'white' : '#374151',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {hasUnconfirmedTransactions ? t('accounts.remindLater') : t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Comptes;
