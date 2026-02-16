// 📊 BUDGET - Page de gestion du budget
// 🌍 i18n enabled
// ✅ Utilise useGuideProgress pour la logique centralisée
// 🎨 Theme support

import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserData } from '../../context/UserDataContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme } from '../../context/ThemeContext';
import { UpgradeModal } from '../../components/common/UpgradePrompt';
import useGuideProgress from '../../hooks/useGuideProgress';
import PageGuideModal from '../../components/common/PageGuideModal';
// 🎯 Tooltips interactifs
import useTooltipTour from '../../hooks/useTooltipTour';
import TooltipTour from '../../components/common/TooltipTour';
// 🆕 Modals tactiles pour saisie mobile-friendly
import NumpadModal from '../../components/common/NumpadModal';
import DayPickerModal from '../../components/common/DayPickerModal';
import AccountPickerModal from '../../components/common/AccountPickerModal';
import DatePickerModal from '../../components/common/DatePickerModal';

const Budget = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userData, saveUserData, isLoading } = useUserData();
  const { canAddMore, limits } = useSubscription();
  const { theme, isDark } = useTheme();
  
  // 📱 Détection mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // 📱 Détecter si on est en mode PWA (standalone)
  const [isPWA, setIsPWA] = useState(false);
  
  useEffect(() => {
    setIsPWA(window.matchMedia('(display-mode: standalone)').matches);
  }, []);
  
  // 📱 Mobile: démarrer directement en plein écran
  const [startFullScreenMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 🔄 Helper pour sauvegarder le budget avec tracking de la date de modification
  const saveBudgetData = (newData) => {
    // Ajouter lastModifiedAt au budgetPlanning si on modifie le budget
    if (newData.budgetPlanning) {
      newData.budgetPlanning.lastModifiedAt = new Date().toISOString();
    }
    saveUserData(newData);
  };
  
  // ✅ Hook centralisé pour la progression du guide
  const { shouldShowGuide, markGuideCompleted, isGuideComplete } = useGuideProgress();
  
  // 💡 Ref pour tracker si le tour est lancé manuellement (bouton aide) vs onboarding
  const isManualTourRef = useRef(false);
  
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
  } = useTooltipTour('budget', {
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
    window.startBudgetTour = () => {
      resetTooltips();
      setTimeout(() => startTooltipTour(), 100);
    };
    return () => delete window.startBudgetTour;
  }, [startTooltipTour, resetTooltips]);
  
  // État pour le guide utilisateur
  const [showGuide, setShowGuide] = useState(false);
  const [showContinueBar, setShowContinueBar] = useState(false);
  
  // Vérifier si le guide doit être affiché
  useEffect(() => {
    if (shouldShowGuide('budget')) {
      setShowGuide(true);
    }
  }, [shouldShowGuide]);
  
  // Fermer le modal et démarrer le tour de tooltips
  const closeModal = () => {
    setShowGuide(false);
    startTooltipTour(); // Démarre le tour de tooltips
  };
  
  // Marquer comme complété et passer à la page suivante
  const continueToNextPage = () => {
    setShowContinueBar(false);
    markGuideCompleted('budget');
    setTimeout(() => {
      navigate('/objectifs');
    }, 100);
  };
  
  const [editingItem, setEditingItem] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingLinkedItem, setEditingLinkedItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState('entrees');
  const [showTransferPopup, setShowTransferPopup] = useState(null);
  const [showOptimizationPopup, setShowOptimizationPopup] = useState(false);
  // 🆕 États pour les modals de saisie tactile
  const [showNumpadModal, setShowNumpadModal] = useState(false);
  const [showDayPickerModal, setShowDayPickerModal] = useState(false);
  const [showAccountPickerModal, setShowAccountPickerModal] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState(null); // 'dateDepart' | 'dateFinRecurrence' | 'date'
  const [dayPickerMode, setDayPickerMode] = useState('monthDay'); // 'monthDay' | 'weekDay' | 'lastDates'
  const [numpadTarget, setNumpadTarget] = useState(null); // 'montant' ou 'jourRecurrence'
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(window.innerWidth < 768);
  const [upgradeModal, setUpgradeModal] = useState({ isOpen: false, type: null }); // Pour les restrictions abonnement
  const [celebrationMessage, setCelebrationMessage] = useState(null); // Message de célébration premier ajout
  
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
  
  const [formData, setFormData] = useState({
    description: '',
    montant: '',
    frequence: 'mensuel',
    jourRecurrence: '',
    jourSemaine: '',
    moisRecurrence: '', // Pour la fréquence annuelle
    dateReference: '',
    compte: '',
    activite: '',
    // 🆕 Champs pour fréquences avancées
    dateDepart: '', // Pour trimestriel/semestriel
    dateFinRecurrence: '', // Date de fin optionnelle
    date: '', // Pour fréquence "1 fois"
    // Optimisation
    optimization: {
      enabled: false,
      type: 'amount', // 'amount' ou 'percentage'
      value: '',
      period: 'ascending', // 'ascending' ou 'descending'
      frequency: '1x' // '1x', '3x', 'always'
    },
    // 🆕 WHAT-IF: Flexibilité du budget (Phase 1)
    flexibility: 'variable' // 'fixed' | 'semi-fixed' | 'variable'
  });
  
  // État pour afficher l'info sur les fréquences
  const [showFrequencyInfo, setShowFrequencyInfo] = useState(false);

  const today = new Date();
  const headerBlue = '#1e2a3a';

  const formatMontant = (montant) => {
    if (balancesHidden) return '••••••';
    return new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }).format(Math.abs(montant));
  };

  // ✅ CORRIGÉ: Format dollar selon la langue ($0 en anglais, 0$ en français)
  const formatMontantShort = (montant) => {
    if (balancesHidden) return '•••';
    const abs = Math.abs(montant);
    const isEnglish = i18n.language === 'en';
    if (abs >= 1000) {
      return isEnglish ? `$${(abs/1000).toFixed(1)}k` : `${(abs/1000).toFixed(1)}k$`;
    }
    return isEnglish ? `$${abs.toFixed(0)}` : `${abs.toFixed(0)}$`;
  };

  const isCompteCredit = (compteName) => {
    if (!compteName || !userData?.accounts) return false;
    const account = userData.accounts.find(a => a.nom === compteName);
    return account?.type === 'credit';
  };

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

  const joursSemaine = [
    { value: '0', label: t('days.sunday') }, { value: '1', label: t('days.monday') }, { value: '2', label: t('days.tuesday') },
    { value: '3', label: t('days.wednesday') }, { value: '4', label: t('days.thursday') }, { value: '5', label: t('days.friday') }, { value: '6', label: t('days.saturday') }
  ];

  const frequenceOptions = [
    { value: 'mensuel', label: t('budget.frequencies.monthly') },
    { value: 'bimensuel', label: t('budget.frequencies.biweekly') },
    { value: 'quinzaine', label: t('budget.frequencies.semimonthly') },
    { value: 'hebdomadaire', label: t('budget.frequencies.weekly') },
    { value: 'trimestriel', label: t('budget.frequencies.quarterly') },
    { value: 'semestriel', label: t('budget.frequencies.semiannual') },
    { value: 'annuel', label: t('budget.frequencies.annual') },
    { value: '1-fois', label: t('budget.frequencies.oneTime') }
  ];

  const entrees = userData?.budgetPlanning?.entrees || [];
  const sorties = userData?.budgetPlanning?.sorties || [];
  const accounts = userData?.accounts || [];

  // Détecter les items liés
  const findLinkedItems = useMemo(() => {
    const links = [];
    const usedEntrees = new Set();
    const usedSorties = new Set();
    
    const getBaseName = (description) => {
      if (!description) return '';
      const beforeDash = description.split('-')[0].trim().toLowerCase();
      return beforeDash;
    };
    
    entrees.forEach((entree, entreeIndex) => {
      if (usedEntrees.has(entreeIndex)) return;
      
      const entreeBaseName = getBaseName(entree.description);
      
      sorties.forEach((sortie, sortieIndex) => {
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
  }, [entrees, sorties]);

  const linkedEntreeIndexes = useMemo(() => new Set(findLinkedItems.map(l => l.entreeIndex)), [findLinkedItems]);
  const linkedSortieIndexes = useMemo(() => new Set(findLinkedItems.map(l => l.sortieIndex)), [findLinkedItems]);

  const budgetSummary = useMemo(() => {
    const calculateMonthly = (items) => {
      let total = 0;
      items.forEach(item => {
        const montant = parseFloat(item.montant) || 0;
        
        // 🆕 Vérifier si l'item a une date de fin passée (exclure du calcul)
        if (item.dateFinRecurrence) {
          const finDate = new Date(item.dateFinRecurrence);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (finDate < today) return; // Skip cet item
        }
        
        // 🆕 Fréquence "1 fois" = 0 pour le calcul mensuel
        if (item.frequence === '1-fois') return;
        
        let mensuel = montant;
        switch (item.frequence) {
          case 'quinzaine': mensuel = montant * 2; break;
          case 'bimensuel': mensuel = montant * 2; break;
          case 'hebdomadaire': mensuel = montant * 4; break;
          case 'trimestriel': mensuel = montant / 3; break;
          case 'semestriel': mensuel = montant / 6; break;
          case 'annuel': mensuel = montant / 12; break;
          default: mensuel = montant;
        }
        total += mensuel;
      });
      return total;
    };
    
    const totalEntrees = calculateMonthly(entrees);
    const totalSorties = calculateMonthly(sorties);
    
    // 🔧 FIX: Calculer le montant des transferts liés
    // Les transferts liés sont exclus des ENTRÉES mais INCLUS dans les SORTIES
    const linkedTransfersAmount = findLinkedItems.reduce((sum, link) => {
      const montant = parseFloat(link.entree.montant) || 0;
      let mensuel = montant;
      switch (link.entree.frequence) {
        case 'quinzaine': mensuel = montant * 2; break;
        case 'bimensuel': mensuel = montant * 2; break;
        case 'hebdomadaire': mensuel = montant * 4; break;
        case 'trimestriel': mensuel = montant / 3; break;
        case 'semestriel': mensuel = montant / 6; break;
        case 'annuel': mensuel = montant / 12; break;
        case '1-fois': mensuel = 0; break;
        default: mensuel = montant;
      }
      return sum + mensuel;
    }, 0);
    
    // 🆕 Nouvelle logique:
    // - Entrées: Exclure les transferts entrants (ce n'est pas un vrai revenu)
    // - Sorties: INCLURE les transferts sortants (c'est une vraie sortie de fonds)
    const realTotalEntrees = totalEntrees - linkedTransfersAmount;
    const realTotalSorties = totalSorties; // Inclut les transferts sortants!
    const balance = realTotalEntrees - realTotalSorties;
    const joursRestants = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const budgetJournalier = joursRestants > 0 ? Math.max(0, balance) / joursRestants : 0;
    
    return { totalEntrees: realTotalEntrees, totalSorties: realTotalSorties, balance, budgetJournalier, joursRestants };
  }, [entrees, sorties, today, findLinkedItems]);

  const handleEdit = (item, type, index, linkedItem = null) => {
    setEditingItem(item);
    setEditingType(type);
    setEditingIndex(index);
    setEditingLinkedItem(linkedItem);
    setFormData({
      description: item.description || '',
      montant: Math.abs(parseFloat(item.montant)).toString(),
      frequence: item.frequence || 'mensuel',
      jourRecurrence: item.jourRecurrence || '',
      jourSemaine: item.jourSemaine || '',
      moisRecurrence: item.moisRecurrence || '',
      dateReference: item.dateReference || '',
      compte: item.compte || '',
      activite: item.activite || '',
      // 🆕 Champs pour fréquences avancées
      dateDepart: item.dateDepart || '',
      dateFinRecurrence: item.dateFinRecurrence || '',
      date: item.date || '',
      optimization: item.optimization || {
        enabled: false,
        type: 'amount',
        value: '',
        period: 'ascending',
        frequency: '1x'
      },
      // 🆕 WHAT-IF: Flexibilité du budget
      flexibility: item.flexibility || 'variable'
    });
  };

  const handleSave = () => {
    if (!formData.description || !formData.montant) {
      alert(t('budget.validation.required'));
      return;
    }
    
    const updatedItem = { 
      ...formData, 
      montant: parseFloat(formData.montant),
      jourRecurrence: parseInt(formData.jourRecurrence) || 1,
      moisRecurrence: formData.frequence === 'annuel' ? (parseInt(formData.moisRecurrence) || 1) : ''
    };
    
    const newData = JSON.parse(JSON.stringify(userData));
    newData.budgetPlanning[editingType][editingIndex] = updatedItem;
    
    if (editingLinkedItem) {
      const linkedType = editingType === 'entrees' ? 'sorties' : 'entrees';
      const linkedIndex = editingLinkedItem.index;
      
      newData.budgetPlanning[linkedType][linkedIndex] = {
        ...newData.budgetPlanning[linkedType][linkedIndex],
        montant: parseFloat(formData.montant),
        frequence: formData.frequence,
        jourRecurrence: parseInt(formData.jourRecurrence) || 1,
        moisRecurrence: formData.frequence === 'annuel' ? (parseInt(formData.moisRecurrence) || 1) : '',
        jourSemaine: formData.jourSemaine,
        dateReference: formData.dateReference,
        // 🆕 Champs pour fréquences avancées
        dateDepart: formData.dateDepart,
        dateFinRecurrence: formData.dateFinRecurrence,
        date: formData.date
      };
    }
    
    if (newData.budgetPlanning.modifications) {
      newData.budgetPlanning.modifications = [];
    }
    
    saveBudgetData(newData);
    handleCancel();
  };

  const handleDeleteRequest = (type, index, item, linkedInfo = null) => {
    setDeleteConfirm({ type, index, item, linkedInfo });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      const newData = JSON.parse(JSON.stringify(userData));
      newData.budgetPlanning[deleteConfirm.type].splice(deleteConfirm.index, 1);
      
      if (deleteConfirm.linkedInfo) {
        const linkedType = deleteConfirm.type === 'entrees' ? 'sorties' : 'entrees';
        let linkedIndex = deleteConfirm.linkedInfo.index;
        newData.budgetPlanning[linkedType].splice(linkedIndex, 1);
      }
      
      if (newData.budgetPlanning.modifications) {
        newData.budgetPlanning.modifications = [];
      }
      
      saveUserData(newData);
      setDeleteConfirm(null);
      handleCancel();
    }
  };

  const handleAdd = () => {
    if (!formData.description || !formData.montant) {
      alert(t('budget.validation.required'));
      return;
    }
    
    const newItem = { 
      ...formData, 
      montant: parseFloat(formData.montant),
      jourRecurrence: parseInt(formData.jourRecurrence) || 1,
      moisRecurrence: formData.frequence === 'annuel' ? (parseInt(formData.moisRecurrence) || 1) : '',
      // 🆕 Champs pour fréquences avancées
      dateDepart: formData.dateDepart || '',
      dateFinRecurrence: formData.dateFinRecurrence || '',
      date: formData.date || ''
    };
    
    // Vérifier si c'est le premier ajout pour la célébration
    const isFirstEntry = addType === 'entrees' && entrees.length === 0;
    const isFirstExpense = addType === 'sorties' && sorties.length === 0;
    
    const newData = JSON.parse(JSON.stringify(userData));
    newData.budgetPlanning[addType].push(newItem);
    
    if (newData.budgetPlanning.modifications) {
      newData.budgetPlanning.modifications = [];
    }
    
    saveUserData(newData);
    setShowAddForm(false);
    resetFormData();
    
    // Afficher la célébration au premier ajout
    if (isFirstEntry) {
      setCelebrationMessage(t('budget.celebration.firstEntry'));
      setTimeout(() => setCelebrationMessage(null), 3000);
    } else if (isFirstExpense) {
      setCelebrationMessage(t('budget.celebration.firstExpense'));
      setTimeout(() => setCelebrationMessage(null), 3000);
    }
  };

  const openAddForm = (type) => {
    // 🔒 Vérifier la limite d'items budget selon l'abonnement
    const totalBudgetItems = (userData?.budgetPlanning?.entrees?.length || 0) + (userData?.budgetPlanning?.sorties?.length || 0);
    if (!canAddMore('budgetItems', totalBudgetItems)) {
      setUpgradeModal({ isOpen: true, type: 'budgetItems' });
      return;
    }
    
    setAddType(type);
    setShowAddForm(true);
  };

  const handleLinkAccount = () => {
    if (!formData.compte) {
      alert(t('budget.validation.selectAccount'));
      return;
    }
    const oppositeType = addType === 'entrees' ? 'sorties' : 'entrees';
    setShowTransferPopup({ oppositeType, sourceAccount: formData.compte });
  };

  const handleCreateLinkedEntry = (targetAccount) => {
    const newData = JSON.parse(JSON.stringify(userData));
    const linkedItem = {
      description: `${formData.description} - ${targetAccount}`,
      montant: parseFloat(formData.montant) || 0,
      frequence: formData.frequence,
      jourRecurrence: parseInt(formData.jourRecurrence) || 1,
      moisRecurrence: formData.frequence === 'annuel' ? (parseInt(formData.moisRecurrence) || 1) : '',
      jourSemaine: formData.jourSemaine,
      dateReference: formData.dateReference,
      compte: targetAccount,
      activite: ''
    };
    newData.budgetPlanning[showTransferPopup.oppositeType].push(linkedItem);
    
    if (newData.budgetPlanning.modifications) {
      newData.budgetPlanning.modifications = [];
    }
    
    saveUserData(newData);
    setShowTransferPopup(null);
  };

  const resetFormData = () => {
    setFormData({ 
      description: '', 
      montant: '', 
      frequence: 'mensuel', 
      jourRecurrence: '', 
      jourSemaine: '', 
      moisRecurrence: '', 
      dateReference: '', 
      compte: '', 
      activite: '',
      // 🆕 Champs pour fréquences avancées
      dateDepart: '',
      dateFinRecurrence: '',
      date: '',
      // 🆕 WHAT-IF: Flexibilité du budget
      flexibility: 'variable',
      optimization: {
        enabled: false,
        type: 'amount',
        value: '',
        period: 'ascending',
        frequency: '1x'
      },
      // 🆕 Flexibilité (What-If Engine)
      flexibility: 'variable'
    });
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditingType(null);
    setEditingIndex(null);
    setEditingLinkedItem(null);
    setShowAddForm(false);
    setShowOptimizationPopup(false);
    resetFormData();
  };

  const getBubbleSize = (montant, allMontants, isEntree) => {
    if (allMontants.length === 0) return 120;
    const min = Math.min(...allMontants);
    const max = Math.max(...allMontants);
    const range = max - min || 1;
    const normalized = (montant - min) / range;
    return 110 + normalized * 40;
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '3em', marginBottom: '15px' }}>📊</div>
        <p style={{ fontSize: '1.2em', color: '#7f8c8d' }}>{t('common.loading')}</p>
      </div>
    );
  }

  if (!userData || !userData.budgetPlanning) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '3em', marginBottom: '15px' }}>📊</div>
        <p style={{ fontSize: '1.2em', color: '#7f8c8d' }}>{t('budget.noData')}</p>
      </div>
    );
  }

  const renderForm = () => {
    // Suggestions cliquables - Populaires + Autres (toutes traduites)
    const popularSuggestions = addType === 'entrees' 
      ? [
          { icon: '💰', label: t('budget.suggestions.entries.0.label', 'Salaire') },
          { icon: '👶', label: t('budget.suggestions.entries.1.label', 'Allocation canadienne') },
          { icon: '🏠', label: t('budget.suggestions.entries.2.label', 'Revenus locatifs') }
        ]
      : [
          { icon: '🏠', label: t('budget.suggestions.expenses.0.label', 'Loyer') },
          { icon: '🛒', label: t('budget.suggestions.expenses.1.label', 'Épicerie') },
          { icon: '📱', label: t('budget.suggestions.expenses.2.label', 'Téléphone') }
        ];
    
    const otherSuggestions = addType === 'entrees'
      ? [
          { icon: '💼', label: t('budget.suggestions.entries.3.label', 'Freelance') },
          { icon: '📊', label: t('budget.suggestions.entries.4.label', 'Dividendes') },
          { icon: '🎁', label: t('budget.suggestions.entries.5.label', 'Cadeaux') },
          { icon: '💸', label: t('budget.suggestions.entries.6.label', 'Remboursements') },
          { icon: '🎰', label: t('budget.suggestions.entries.7.label', 'Loterie') },
          { icon: '💵', label: t('budget.suggestions.entries.8.label', 'Pension') }
        ]
      : [
          { icon: '🎬', label: t('budget.suggestions.expenses.3.label', 'Netflix') },
          { icon: '⛽', label: t('budget.suggestions.expenses.4.label', 'Essence') },
          { icon: '💡', label: t('budget.suggestions.expenses.5.label', 'Hydro') },
          { icon: '🔥', label: t('budget.suggestions.expenses.6.label', 'Chauffage') },
          { icon: '🚗', label: t('budget.suggestions.expenses.7.label', 'Auto') },
          { icon: '🏥', label: t('budget.suggestions.expenses.8.label', 'Assurances') },
          { icon: '🍽️', label: t('budget.suggestions.expenses.9.label', 'Restaurant') },
          { icon: '🏋️', label: t('budget.suggestions.expenses.10.label', 'Gym') },
          { icon: '💈', label: t('budget.suggestions.expenses.11.label', 'Coiffure') },
          { icon: '🎨', label: t('budget.suggestions.expenses.12.label', 'Loisirs') }
        ];
    
    const accentColor = addType === 'entrees' ? '#3498db' : '#ffa500';
    
    const placeholder = addType === 'entrees' 
      ? t('budget.entryPlaceholder') 
      : t('budget.expensePlaceholder');
    
    // Validation en temps réel
    const montantValue = parseFloat(formData.montant) || 0;
    const jourValue = parseInt(formData.jourRecurrence) || 0;
    const montantError = formData.montant && montantValue <= 0;
    const jourError = formData.jourRecurrence && (jourValue < 1 || jourValue > 31);
    
    return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {/* 🆕 Suggestions améliorées sur 3 lignes */}
      {!formData.description && (
        <div style={{ marginBottom: '5px' }}>
          {/* Conteneur flex-wrap sur 3 lignes */}
          <div 
            className="suggestions-scroll"
            style={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: '8px', 
              maxHeight: '140px',
              overflowY: 'auto',
              paddingRight: '5px',
              scrollbarWidth: 'thin',
              scrollbarColor: `${accentColor} rgba(255,255,255,0.1)`
            }}
          >
            {/* Suggestions populaires */}
            {popularSuggestions.map((s, i) => (
              <button
                key={`pop-${i}`}
                type="button"
                onClick={() => setFormData({...formData, description: s.label})}
                style={{
                  padding: '8px 14px',
                  borderRadius: '20px',
                  border: `2px solid ${accentColor}`,
                  background: `${accentColor}30`,
                  color: 'white',
                  fontSize: '0.85em',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = accentColor;
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = `0 4px 15px ${accentColor}50`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${accentColor}30`;
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
            
            {/* Autres suggestions */}
            {otherSuggestions.map((s, i) => (
              <button
                key={`other-${i}`}
                type="button"
                onClick={() => setFormData({...formData, description: s.label})}
                style={{
                  padding: '8px 14px',
                  borderRadius: '20px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '0.85em',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${accentColor}40`;
                  e.currentTarget.style.borderColor = accentColor;
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
          {/* 🆕 Message d'aide mobile */}
          <p className="mobile-hint" style={{ 
            display: 'none', 
            fontSize: '0.8em', 
            color: 'rgba(255,255,255,0.7)', 
            margin: '8px 0 0 0',
            textAlign: 'center'
          }}>
            💡 {t('budget.mobileHint', 'Cliquez sur une suggestion ou tapez votre description')}
          </p>
        </div>
      )}
      
      <div>
        <label style={{ display: 'block', fontSize: '1em', color: 'white', marginBottom: '6px', fontWeight: '600' }}>{t('budget.description')} *</label>
        <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder={placeholder}
          style={{ width: '100%', padding: '12px 14px', fontSize: '0.95em', border: '2px solid #e0e0e0', borderRadius: '10px', outline: 'none', boxSizing: 'border-box', fontStyle: formData.description ? 'normal' : 'italic' }}
          onFocus={(e) => e.target.style.borderColor = '#667eea'} onBlur={(e) => e.target.style.borderColor = '#e0e0e0'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '1em', color: 'white', marginBottom: '6px', fontWeight: '600' }}>{t('budget.amount')} ($) *</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* 🆕 Bouton tactile pour ouvrir le Numpad */}
            <button
              type="button"
              onClick={() => {
                setNumpadTarget('montant');
                setShowNumpadModal(true);
              }}
              style={{ 
                flex: 1, padding: '12px 14px', fontSize: '0.95em', 
                border: `2px solid ${montantError ? '#e74c3c' : formData.optimization?.enabled ? '#27ae60' : '#e0e0e0'}`, 
                borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
                background: 'white',
                color: formData.montant ? '#2c3e50' : accentColor,
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: formData.montant ? 'left' : 'center',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: formData.montant ? 'flex-start' : 'center',
                height: '48px',
                minHeight: '48px'
              }}
            >
              {formData.montant ? `${parseFloat(formData.montant).toFixed(2)}$` : (
                <span style={{ 
                  fontSize: '2.2em', 
                  fontWeight: '700',
                  color: accentColor,
                  lineHeight: 1
                }}>{addType === 'entrees' ? '+' : '−'}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowOptimizationPopup(true)}
              title={t('budget.optimization.title') || 'Optimisation'}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                border: `2px solid ${formData.optimization?.enabled ? '#27ae60' : '#e0e0e0'}`,
                background: formData.optimization?.enabled ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' : 'white',
                color: formData.optimization?.enabled ? 'white' : '#7f8c8d',
                fontSize: '1.2em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              ♻️
            </button>
          </div>
          {montantError && (
            <p style={{ margin: '4px 0 0', fontSize: '0.75em', color: '#e74c3c' }}>
              ⚠️ {t('budget.validation.amountZero')}
            </p>
          )}
          {formData.optimization?.enabled && (
            <p style={{ margin: '4px 0 0', fontSize: '0.75em', color: '#27ae60', fontWeight: '500' }}>
              ♻️ +{formData.optimization.type === 'percentage' ? `${formData.optimization.value}%` : `${formData.optimization.value}$`} ({formData.optimization.period === 'ascending' ? '📈' : '📉'})
            </p>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '1em', color: 'white', marginBottom: '6px', fontWeight: '600' }}>
            <span>{t('budget.frequency')}</span>
            <button
              type="button"
              onClick={() => setShowFrequencyInfo(!showFrequencyInfo)}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '1.5px solid #667eea',
                background: showFrequencyInfo ? '#667eea' : 'white',
                color: showFrequencyInfo ? 'white' : '#667eea',
                fontSize: '0.75em',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                lineHeight: 1
              }}
            >
              i
            </button>
          </label>
          
          {/* Popup d'info sur les fréquences - POSITIONNÉ AU-DESSUS */}
          {showFrequencyInfo && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              right: 0,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '2px solid #667eea',
              borderRadius: '16px',
              padding: '16px 18px',
              boxShadow: '0 -8px 30px rgba(102, 126, 234, 0.35), 0 4px 15px rgba(0,0,0,0.3)',
              zIndex: 1000,
              width: '300px',
              fontSize: '0.85em'
            }}>
              {/* Petite flèche vers le bas */}
              <div style={{
                position: 'absolute',
                bottom: '-8px',
                right: '20px',
                width: '14px',
                height: '14px',
                background: '#16213e',
                border: '2px solid #667eea',
                borderTop: 'none',
                borderLeft: 'none',
                transform: 'rotate(45deg)'
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 'bold', color: '#667eea', fontSize: '1.05em' }}>ℹ️ {t('budget.frequencyInfo.title')}</span>
                <button
                  type="button"
                  onClick={() => setShowFrequencyInfo(false)}
                  style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    border: 'none', 
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer', 
                    fontSize: '0.9em', 
                    color: 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  }}
                >
                  ✕
                </button>
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 16px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, fontSize: '0.92em' }}>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: '#667eea' }}>{t('budget.frequencies.monthly')}</strong>: {t('budget.frequencyInfo.monthly')}</li>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: '#667eea' }}>{t('budget.frequencies.biweekly')}</strong>: {t('budget.frequencyInfo.biweekly')}</li>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: '#667eea' }}>{t('budget.frequencies.semimonthly')}</strong>: {t('budget.frequencyInfo.semimonthly')}</li>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: '#667eea' }}>{t('budget.frequencies.weekly')}</strong>: {t('budget.frequencyInfo.weekly')}</li>
                <li><strong style={{ color: '#667eea' }}>{t('budget.frequencies.annual')}</strong>: {t('budget.frequencyInfo.annual')}</li>
              </ul>
            </div>
          )}
          
          <select value={formData.frequence} onChange={(e) => setFormData({...formData, frequence: e.target.value, jourSemaine: '', dateReference: '', moisRecurrence: '', dateDepart: '', dateFinRecurrence: '', date: ''})}
            style={{ 
              width: '100%', padding: '12px 14px', fontSize: '0.95em', 
              border: '2px solid #e0e0e0', borderRadius: '10px', outline: 'none', cursor: 'pointer',
              color: accentColor,
              fontWeight: '700',
              height: '48px',
              minHeight: '48px'
            }}>
            {frequenceOptions.map(opt => (
              <option key={opt.value} value={opt.value} style={{ fontWeight: '600' }}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      {formData.frequence === 'bimensuel' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '1em', color: 'white', marginBottom: '6px', fontWeight: '600' }}>{t('budget.dayOfWeek')}</label>
            {/* 🆕 Bouton tactile pour ouvrir DayPicker en mode weekDay */}
            <button
              type="button"
              onClick={() => {
                setDayPickerMode('weekDay');
                setShowDayPickerModal(true);
              }}
              style={{ 
                width: '100%', padding: '12px 14px', fontSize: '0.95em', 
                border: '2px solid #e0e0e0', 
                borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
                background: 'white',
                color: formData.jourSemaine ? '#2c3e50' : accentColor,
                fontWeight: formData.jourSemaine ? '600' : '700',
                cursor: 'pointer',
                textAlign: formData.jourSemaine ? 'left' : 'center',
                transition: 'all 0.2s'
              }}
            >
              {formData.jourSemaine ? joursSemaine.find(j => j.value === formData.jourSemaine)?.label : t('budget.tapToSelect', 'Sélectionner')}
            </button>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '1em', color: 'white', marginBottom: '6px', fontWeight: '600' }}>{t('budget.lastDate')}</label>
            {/* 🆕 Bouton tactile pour ouvrir DayPicker en mode lastDates */}
            <button
              type="button"
              onClick={() => {
                setDayPickerMode('lastDates');
                setShowDayPickerModal(true);
              }}
              style={{ 
                width: '100%', padding: '12px 14px', fontSize: '0.95em', 
                border: '2px solid #e0e0e0', 
                borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
                background: 'white',
                color: formData.dateReference ? '#2c3e50' : accentColor,
                fontWeight: formData.dateReference ? '600' : '700',
                cursor: 'pointer',
                textAlign: formData.dateReference ? 'left' : 'center',
                transition: 'all 0.2s'
              }}
            >
              {formData.dateReference 
                ? (() => {
                    const [yr, mo, dy] = formData.dateReference.split('-').map(Number);
                    const d = new Date(yr, mo - 1, dy);
                    const monthsShort = i18n.language === 'fr' 
                      ? ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']
                      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${d.getDate()} ${monthsShort[d.getMonth()]}`;
                  })() 
                : t('budget.tapToSelect', 'Sélectionner')}
            </button>
          </div>
        </div>
      ) : formData.frequence === 'hebdomadaire' ? (
        <div>
          <label style={{ display: 'block', fontSize: '1em', color: 'white', marginBottom: '6px', fontWeight: '600' }}>{t('budget.dayOfWeek')}</label>
          {/* 🆕 Bouton tactile pour ouvrir DayPicker en mode weekDay */}
          <button
            type="button"
            onClick={() => {
              setDayPickerMode('weekDay');
              setShowDayPickerModal(true);
            }}
            style={{ 
              width: '100%', padding: '12px 14px', fontSize: '0.95em', 
              border: '2px solid #e0e0e0', 
              borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
              background: 'white',
              color: formData.jourSemaine ? '#2c3e50' : accentColor,
              fontWeight: formData.jourSemaine ? '600' : '700',
              cursor: 'pointer',
              textAlign: formData.jourSemaine ? 'left' : 'center',
              transition: 'all 0.2s'
            }}
          >
            {formData.jourSemaine ? joursSemaine.find(j => j.value === formData.jourSemaine)?.label : t('budget.tapToSelect', 'Sélectionner')}
          </button>
        </div>
      ) : formData.frequence === 'annuel' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '1em', color: 'white', marginBottom: '6px', fontWeight: '600' }}>{t('budget.month')}</label>
            <select value={formData.moisRecurrence} onChange={(e) => setFormData({...formData, moisRecurrence: e.target.value})}
              style={{ 
                width: '100%', padding: '12px 14px', fontSize: '0.95em', 
                border: '2px solid #e0e0e0', borderRadius: '10px', outline: 'none', cursor: 'pointer',
                color: formData.moisRecurrence ? '#2c3e50' : accentColor,
                fontWeight: '600',
                minHeight: '44px'
              }}>
              <option value="">{t('budget.tapToSelect', 'Sélectionner')}</option>
              {moisOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '1em', color: 'white', marginBottom: '6px', fontWeight: '600' }}>{t('budget.dayOfMonth')} (1-31)</label>
            {/* 🆕 Bouton tactile pour ouvrir le Day Picker */}
            <button
              type="button"
              onClick={() => {
                setDayPickerMode('monthDay');
                setShowDayPickerModal(true);
              }}
              style={{ 
                width: '100%', padding: '12px 14px', fontSize: '0.95em', 
                border: `2px solid ${jourError ? '#e74c3c' : '#e0e0e0'}`, 
                borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
                background: 'white',
                color: formData.jourRecurrence ? '#2c3e50' : accentColor,
                fontWeight: formData.jourRecurrence ? '600' : '700',
                cursor: 'pointer',
                textAlign: formData.jourRecurrence ? 'left' : 'center',
                transition: 'all 0.2s',
                minHeight: '44px'
              }}
            >
              {formData.jourRecurrence ? `📅 ${t('budget.day', 'Jour')} ${formData.jourRecurrence}` : t('budget.tapToSelect', 'Sélectionner')}
            </button>
            {jourError && (
              <p style={{ margin: '4px 0 0', fontSize: '0.75em', color: '#e74c3c' }}>
                ⚠️ {t('budget.validation.dayInvalid')}
              </p>
            )}
          </div>
        </div>
      ) : formData.frequence === '1-fois' ? (
        /* 🆕 FRÉQUENCE "1 FOIS" - Bouton pour DatePickerModal */
        <div>
          <label style={{ display: 'block', fontSize: '1em', color: 'white', marginBottom: '6px', fontWeight: '600' }}>📅 {t('budget.transactionDate')}</label>
          <button
            type="button"
            onClick={() => {
              setDatePickerTarget('date');
              setShowDatePickerModal(true);
            }}
            style={{ 
              width: '100%', padding: '12px 14px', fontSize: '0.95em', 
              border: '2px solid #e0e0e0', borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
              background: 'white',
              color: formData.date ? '#2c3e50' : accentColor,
              fontWeight: '600',
              cursor: 'pointer',
              textAlign: formData.date ? 'left' : 'center',
              height: '48px',
              minHeight: '48px'
            }}
          >
            {formData.date ? (
              (() => {
                const [yr, mo, dy] = formData.date.split('-').map(Number);
                const d = new Date(yr, mo - 1, dy);
                const monthsFull = i18n.language === 'fr'
                  ? ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
                  : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                return `${d.getDate()} ${monthsFull[d.getMonth()]} ${d.getFullYear()}`;
              })()
            ) : t('budget.tapToSelect', 'Sélectionner')}
          </button>
          <p style={{ margin: '6px 0 0', fontSize: '0.85em', color: 'rgba(255,255,255,0.7)' }}>
            💡 {t('budget.oneTimeHint')}
          </p>
        </div>
      ) : (formData.frequence === 'trimestriel' || formData.frequence === 'semestriel') ? (
        /* 🆕 FRÉQUENCES TRIMESTRIEL/SEMESTRIEL - Boutons pour DatePickerModal */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '1em', color: 'white', marginBottom: '6px', fontWeight: '600' }}>📅 {t('budget.startDate')}</label>
            <button
              type="button"
              onClick={() => {
                setDatePickerTarget('dateDepart');
                setShowDatePickerModal(true);
              }}
              style={{ 
                width: '100%', padding: '12px 14px', fontSize: '0.95em', 
                border: '2px solid #e0e0e0', borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
                background: 'white',
                color: formData.dateDepart ? '#2c3e50' : accentColor,
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: formData.dateDepart ? 'left' : 'center',
                height: '48px',
                minHeight: '48px'
              }}
            >
              {formData.dateDepart ? (
                (() => {
                  const [yr, mo, dy] = formData.dateDepart.split('-').map(Number);
                  const d = new Date(yr, mo - 1, dy);
                  const monthsFull = i18n.language === 'fr'
                    ? ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
                    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                  return `${d.getDate()} ${monthsFull[d.getMonth()]} ${d.getFullYear()}`;
                })()
              ) : t('budget.tapToSelect', 'Sélectionner')}
            </button>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '1em', color: 'white', marginBottom: '6px', fontWeight: '600' }}>
              🗓️ {t('budget.endDate')} <span style={{ fontWeight: 'normal', color: 'rgba(255,255,255,0.7)' }}>({t('common.optional')})</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setDatePickerTarget('dateFinRecurrence');
                setShowDatePickerModal(true);
              }}
              style={{ 
                width: '100%', padding: '12px 14px', fontSize: '0.95em', 
                border: '2px solid #e0e0e0', borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
                background: 'white',
                color: formData.dateFinRecurrence ? '#2c3e50' : accentColor,
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: formData.dateFinRecurrence ? 'left' : 'center',
                height: '48px',
                minHeight: '48px'
              }}
            >
              {formData.dateFinRecurrence ? (
                (() => {
                  const [yr, mo, dy] = formData.dateFinRecurrence.split('-').map(Number);
                  const d = new Date(yr, mo - 1, dy);
                  const monthsFull = i18n.language === 'fr'
                    ? ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
                    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                  return `${d.getDate()} ${monthsFull[d.getMonth()]} ${d.getFullYear()}`;
                })()
              ) : t('budget.tapToSelect', 'Sélectionner')}
            </button>
            <p style={{ margin: '6px 0 0', fontSize: '0.85em', color: 'rgba(255,255,255,0.7)' }}>
              💡 {t('budget.endDateHint')}
            </p>
          </div>
        </div>
      ) : (
        <div>
          <label style={{ display: 'block', fontSize: '1em', color: 'white', marginBottom: '6px', fontWeight: '600' }}>{t('budget.dayOfMonth')} (1-31)</label>
          {/* 🆕 Bouton tactile pour ouvrir le Day Picker */}
          <button
            type="button"
            onClick={() => {
              setDayPickerMode('monthDay');
              setShowDayPickerModal(true);
            }}
            style={{ 
              width: '100%', padding: '12px 14px', fontSize: '0.95em', 
              border: `2px solid ${jourError ? '#e74c3c' : '#e0e0e0'}`, 
              borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
              background: 'white',
              color: formData.jourRecurrence ? '#2c3e50' : accentColor,
              fontWeight: formData.jourRecurrence ? '600' : '700',
              cursor: 'pointer',
              textAlign: formData.jourRecurrence ? 'left' : 'center',
              transition: 'all 0.2s'
            }}
          >
            {formData.jourRecurrence ? `📅 ${t('budget.day', 'Jour')} ${formData.jourRecurrence}` : t('budget.tapToSelect', 'Sélectionner')}
          </button>
          {jourError && (
            <p style={{ margin: '4px 0 0', fontSize: '0.75em', color: '#e74c3c' }}>
              ⚠️ {t('budget.validation.dayInvalid')}
            </p>
          )}
        </div>
      )}
      <div>
        <label style={{ display: 'block', fontSize: '1em', color: 'white', marginBottom: '6px', fontWeight: '600' }}>{t('budget.account')}</label>
        {/* 🆕 Bouton tactile pour ouvrir AccountPickerModal */}
        <button
          type="button"
          onClick={() => setShowAccountPickerModal(true)}
          style={{ 
            width: '100%', padding: '12px 14px', fontSize: '0.95em', 
            border: '2px solid #e0e0e0', borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
            background: 'white',
            color: formData.compte ? '#2c3e50' : accentColor,
            fontWeight: '600',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
            height: '48px',
            minHeight: '48px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {formData.compte ? (
            <>
              <span>{accounts.find(a => a.nom === formData.compte)?.type === 'hypotheque' ? '🏠' : accounts.find(a => a.nom === formData.compte)?.type === 'credit' ? '🏦' : accounts.find(a => a.nom === formData.compte)?.type === 'epargne' ? '🌱' : '💳'}</span>
              <span>{formData.compte}</span>
            </>
          ) : (
            <span style={{ width: '100%', textAlign: 'center', fontWeight: '700' }}>{t('budget.tapToSelect', 'Sélectionner')}</span>
          )}
        </button>
      </div>
      
      {/* 🆕 Sélecteur de Flexibilité (What-If Engine) */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1em', color: 'white', marginBottom: '6px', fontWeight: '600' }}>
          <span>🔄 {t('budget.flexibility.label', 'Flexibilité')}</span>
          <span style={{ 
            fontSize: '0.7em', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            padding: '2px 8px', 
            borderRadius: '10px',
            fontWeight: '500'
          }}>What-If</span>
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Bouton FIXE */}
          <button
            type="button"
            onClick={() => setFormData({...formData, flexibility: 'fixed'})}
            style={{
              flex: 1,
              padding: '12px 8px',
              borderRadius: '12px',
              border: `2px solid ${formData.flexibility === 'fixed' ? '#9b59b6' : 'rgba(255,255,255,0.3)'}`,
              background: formData.flexibility === 'fixed' 
                ? 'linear-gradient(135deg, rgba(155, 89, 182, 0.3) 0%, rgba(142, 68, 173, 0.3) 100%)' 
                : 'rgba(255,255,255,0.05)',
              color: formData.flexibility === 'fixed' ? '#9b59b6' : 'rgba(255,255,255,0.7)',
              fontWeight: '600',
              fontSize: '0.85em',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '1.3em' }}>🔒</span>
            <span>{t('budget.flexibility.fixed', 'Fixe')}</span>
          </button>
          
          {/* Bouton SEMI-FIXE */}
          <button
            type="button"
            onClick={() => setFormData({...formData, flexibility: 'semi-fixed'})}
            style={{
              flex: 1,
              padding: '12px 8px',
              borderRadius: '12px',
              border: `2px solid ${formData.flexibility === 'semi-fixed' ? '#f39c12' : 'rgba(255,255,255,0.3)'}`,
              background: formData.flexibility === 'semi-fixed' 
                ? 'linear-gradient(135deg, rgba(243, 156, 18, 0.3) 0%, rgba(230, 126, 34, 0.3) 100%)' 
                : 'rgba(255,255,255,0.05)',
              color: formData.flexibility === 'semi-fixed' ? '#f39c12' : 'rgba(255,255,255,0.7)',
              fontWeight: '600',
              fontSize: '0.85em',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '1.3em' }}>🔄</span>
            <span>{t('budget.flexibility.semiFix', 'Semi-fixe')}</span>
          </button>
          
          {/* Bouton VARIABLE */}
          <button
            type="button"
            onClick={() => setFormData({...formData, flexibility: 'variable'})}
            style={{
              flex: 1,
              padding: '12px 8px',
              borderRadius: '12px',
              border: `2px solid ${formData.flexibility === 'variable' ? '#27ae60' : 'rgba(255,255,255,0.3)'}`,
              background: formData.flexibility === 'variable' 
                ? 'linear-gradient(135deg, rgba(39, 174, 96, 0.3) 0%, rgba(46, 204, 113, 0.3) 100%)' 
                : 'rgba(255,255,255,0.05)',
              color: formData.flexibility === 'variable' ? '#27ae60' : 'rgba(255,255,255,0.7)',
              fontWeight: '600',
              fontSize: '0.85em',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '1.3em' }}>🌊</span>
            <span>{t('budget.flexibility.variable', 'Variable')}</span>
          </button>
        </div>
        {/* Description de la flexibilité sélectionnée */}
        <p style={{ margin: '8px 0 0', fontSize: '0.8em', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
          {formData.flexibility === 'fixed' && (
            <>🔒 {t('budget.flexibility.fixedDesc', 'Date imposée - ne peut pas être déplacé (ex: loyer, hypothèque)')}</>
          )}
          {formData.flexibility === 'semi-fixed' && (
            <>🔄 {t('budget.flexibility.semiFixedDesc', 'Date habituelle - peut être décalé de quelques jours (ex: Hydro, Internet)')}</>
          )}
          {formData.flexibility === 'variable' && (
            <>🌊 {t('budget.flexibility.variableDesc', 'Date flexible - peut être déplacé librement (ex: épicerie, sorties)')}</>
          )}
        </p>
      </div>
    </div>
  );
  };

  const allEntreesMontants = entrees.map(e => parseFloat(e.montant) || 0);
  const allSortiesMontants = sorties.map(s => parseFloat(s.montant) || 0);

  const calculateGridPosition = (index, total) => {
    const cols = Math.ceil(Math.sqrt(total));
    const rows = Math.ceil(total / cols);
    const col = index % cols;
    const row = Math.floor(index / cols);
    const padding = 5;
    const usableWidth = 100 - (padding * 2);
    const usableHeight = 100 - (padding * 2);
    const cellWidth = usableWidth / cols;
    const cellHeight = usableHeight / rows;
    const xPercent = padding + (col + 0.5) * cellWidth;
    const yPercent = padding + (row + 0.5) * cellHeight;
    return { xPercent, yPercent };
  };

  const unlinkedEntrees = entrees.filter((_, index) => !linkedEntreeIndexes.has(index));
  const unlinkedSorties = sorties.filter((_, index) => !linkedSortieIndexes.has(index));
  const unlinkedEntreesIndexes = entrees.map((_, i) => i).filter(i => !linkedEntreeIndexes.has(i));
  const unlinkedSortiesIndexes = sorties.map((_, i) => i).filter(i => !linkedSortieIndexes.has(i));

  const renderBubbles = (items, type, allMontants, originalIndexes, baseIndex = 0) => {
    const isEntree = type === 'entrees';
    const isExpanded = expandedSection === type;

    // 📱 Mobile: Layout optimisé - zones d'expansion en haut (entrées) et bas (sorties)
    // Non-expanded: petit cercle compteur près du centre
    // Expanded: zone large en haut ou en bas pour afficher toutes les bulles
    const mobileStyles = isMobile ? (
      isExpanded ? {
        // Zone d'expansion: haut pour entrées, bas pour sorties
        position: 'absolute',
        top: isEntree ? '3%' : 'auto',
        bottom: isEntree ? 'auto' : '8%',
        left: '5%',
        right: '5%',
        height: isEntree ? '28%' : '28%',
        width: 'auto',
        transform: 'none'
      } : {
        // Non-expanded: cercle compteur positionné - REMONTÉ
        position: 'absolute',
        top: isEntree ? '8%' : '68%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80px',
        height: '80px'
      }
    ) : {
      // Desktop: rectangle centré autour de la bulle compteur
      top: '30%',
      bottom: '30%',
      left: isEntree ? '0%' : '70%',
      width: '25%'
    };
    
    // 📱 Mobile: Calcul dynamique de la taille et disposition des bulles
    const getMobileBubbleLayout = (totalItems) => {
      // Taille des bulles selon le nombre
      if (totalItems <= 2) return { size: 100, cols: 2, gap: 15 };
      if (totalItems <= 4) return { size: 85, cols: 2, gap: 12 };
      if (totalItems <= 6) return { size: 75, cols: 3, gap: 10 };
      if (totalItems <= 9) return { size: 65, cols: 3, gap: 8 };
      return { size: 55, cols: 4, gap: 6 };
    };

    // 📱 Mobile: Layout en grille pour les bulles expandées
    const mobileLayout = getMobileBubbleLayout(items.length);
    
    return (
      <div
        data-tooltip={!isExpanded ? (isEntree ? 'entries' : 'expenses') : undefined}
        onMouseEnter={() => setExpandedSection(type)}
        onMouseLeave={() => setExpandedSection(null)}
        onClick={(e) => { 
          e.stopPropagation(); 
          if (isMobile && !isExpanded) setExpandedSection(type); 
        }}
        style={{
          ...mobileStyles,
          position: 'absolute',
          zIndex: isExpanded ? 60 : 5,
          ...(isMobile && isExpanded ? {
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignContent: 'center',
            gap: `${mobileLayout.gap}px`,
            padding: '10px',
            overflowY: 'auto',
            background: 'transparent',
            borderRadius: '20px'
          } : {})
        }}
      >
        {!isExpanded && (
          <div 
            title={isEntree ? t('budget.emptyState.entriesHint') : t('budget.emptyState.expensesHint')}
            style={{
            position: isMobile ? 'relative' : 'absolute',
            left: isMobile ? 'auto' : '50%',
            top: isMobile ? 'auto' : '50%',
            transform: isMobile ? 'none' : 'translate(-50%, -50%)',
            width: isMobile ? '70px' : '110px',
            height: isMobile ? '70px' : '110px',
            borderRadius: '50%',
            background: isEntree 
              ? 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'
              : 'linear-gradient(135deg, #ffa500 0%, #ff8c00 100%)',
            border: isMobile ? '3px solid white' : '4px solid white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 30px ${isEntree ? 'rgba(52, 152, 219, 0.4)' : 'rgba(255, 165, 0, 0.4)'}`,
            cursor: 'pointer'
          }}>
            <span style={{ fontSize: isMobile ? '1.4em' : '2em', fontWeight: 'bold', color: 'white' }}>
              {isEntree ? '+' : '-'}
            </span>
            <span style={{ fontSize: isMobile ? '1.1em' : '1.5em', fontWeight: 'bold', color: 'white' }}>
              {items.length}
            </span>
            <span style={{ fontSize: isMobile ? '0.6em' : '0.75em', color: 'rgba(255,255,255,0.9)' }}>
              {formatMontantShort(isEntree ? budgetSummary.totalEntrees : budgetSummary.totalSorties)}
            </span>
          </div>
        )}

        {isExpanded && items.map((item, displayIndex) => {
          const originalIndex = originalIndexes[displayIndex];
          const pos = calculateGridPosition(displayIndex, items.length);
          const size = getBubbleSize(parseFloat(item.montant) || 0, allMontants, isEntree);
          const isCredit = isCompteCredit(item.compte);
          
          // 🔒 Vérifier si l'item est verrouillé (au-delà de la limite)
          const globalIndex = baseIndex + displayIndex;
          const isLocked = globalIndex >= limits.maxBudgetItems;
          
          // Tooltip détaillé avec info de récurrence appropriée
          const frequenceLabel = t(`budget.frequencies.${item.frequence}`, item.frequence);
          let jourLabel = '';
          if (item.frequence === 'hebdomadaire' && item.jourSemaine !== undefined && item.jourSemaine !== '') {
            // Weekly: show day of week
            const jourNom = joursSemaine.find(j => j.value === item.jourSemaine)?.label || '';
            jourLabel = jourNom ? `, ${jourNom}` : '';
          } else if (item.frequence === 'bimensuel' && item.jourSemaine !== undefined && item.jourSemaine !== '') {
            // Bi-weekly: show day of week
            const jourNom = joursSemaine.find(j => j.value === item.jourSemaine)?.label || '';
            jourLabel = jourNom ? `, ${jourNom}` : '';
          } else if (item.frequence === 'annuel') {
            // Annual: show month and day
            const moisNom = item.moisRecurrence ? moisOptions.find(m => m.value === String(item.moisRecurrence))?.label : '';
            jourLabel = moisNom 
              ? `, ${item.jourRecurrence || 1} ${moisNom}`
              : `, ${t('budget.dayOfMonth').toLowerCase()} ${item.jourRecurrence || 1}`;
          } else if (item.frequence === 'mensuel' || item.frequence === 'quinzaine') {
            // Monthly/Semi-monthly: show day of month
            jourLabel = `, ${t('budget.dayOfMonth').toLowerCase()} ${item.jourRecurrence || 1}`;
          }
          const tooltipText = `${item.description}: ${formatMontant(item.montant)}/${frequenceLabel}${jourLabel}${item.compte ? `, ${item.compte}` : ''}`;
          
          // Indicateur d'optimisation
          const hasOptimization = item.optimization?.enabled;
          
          // 🆕 Vérifier si l'item est passé/expiré (pour griser la bulle)
          const isExpired = (() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Fréquence "1 fois" avec date passée
            if (item.frequence === '1-fois' && item.date) {
              const itemDate = new Date(item.date);
              return itemDate < today;
            }
            
            // Date de fin de récurrence passée
            if (item.dateFinRecurrence) {
              const endDate = new Date(item.dateFinRecurrence);
              return endDate < today;
            }
            
            return false;
          })();
          
          // 📱 Mobile: utiliser la taille dynamique du layout
          const bubbleSize = isMobile ? mobileLayout.size : size;
          
          return (
            <div
              key={`${type}-${originalIndex}`}
              title={isLocked ? '' : tooltipText}
              className="bubble-new"
              onClick={(e) => { 
                e.stopPropagation(); 
                if (!isLocked) handleEdit(item, type, originalIndex); 
              }}
              style={{
                // 📱 Mobile: position relative pour flex layout, absolute pour desktop
                position: isMobile ? 'relative' : 'absolute',
                left: isMobile ? 'auto' : `${pos.xPercent}%`,
                top: isMobile ? 'auto' : `${pos.yPercent}%`,
                transform: isMobile ? 'none' : 'translate(-50%, -50%)',
                width: `${bubbleSize}px`,
                height: `${bubbleSize}px`,
                minWidth: `${bubbleSize}px`,
                minHeight: `${bubbleSize}px`,
                borderRadius: '50%',
                background: 'white',
                border: `${isMobile ? '3px' : '4px'} solid ${hasOptimization ? '#3498db' : (isEntree ? '#3498db' : '#ffa500')}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxShadow: hasOptimization 
                  ? '0 4px 15px rgba(52, 152, 219, 0.4), 0 0 0 3px rgba(52, 152, 219, 0.2)'
                  : '0 4px 15px rgba(0,0,0,0.15)',
                padding: isMobile ? '5px' : '10px',
                boxSizing: 'border-box',
                filter: isLocked ? 'blur(4px)' : (isExpired ? 'grayscale(100%)' : 'none'),
                opacity: isLocked ? 0.5 : (isExpired ? 0.5 : 1),
                pointerEvents: isLocked ? 'none' : 'auto',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.08)';
                  e.currentTarget.style.boxShadow = `0 8px 25px ${isEntree ? 'rgba(52, 152, 219, 0.5)' : 'rgba(255, 165, 0, 0.5)'}`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                  e.currentTarget.style.boxShadow = hasOptimization 
                    ? '0 4px 15px rgba(52, 152, 219, 0.4), 0 0 0 3px rgba(52, 152, 219, 0.2)'
                    : '0 4px 15px rgba(0,0,0,0.15)';
                }
              }}
            >
              {/* Badge verrou pour items verrouillés */}
              {isLocked && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setUpgradeModal({ isOpen: true, type: 'budgetItems' });
                  }}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '50px',
                    height: '50px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    fontSize: '1.2em',
                    zIndex: 10,
                    filter: 'none',
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'}
                >
                  <span>🔒</span>
                </div>
              )}
              {/* Badge d'optimisation */}
              {hasOptimization && (
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65em',
                  boxShadow: '0 2px 8px rgba(52, 152, 219, 0.4)'
                }}>
                  ♻️
                </div>
              )}
              {/* 🆕 Badge de flexibilité (What-If) */}
              {item.flexibility && item.flexibility !== 'variable' && (
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  left: '-5px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: item.flexibility === 'fixed' 
                    ? 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)' 
                    : 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65em',
                  boxShadow: item.flexibility === 'fixed' 
                    ? '0 2px 8px rgba(155, 89, 182, 0.4)'
                    : '0 2px 8px rgba(243, 156, 18, 0.4)'
                }}>
                  {item.flexibility === 'fixed' ? '🔒' : '🔄'}
                </div>
              )}
              <span style={{
                fontSize: isMobile ? '0.6em' : '0.85em',
                fontWeight: '600',
                color: '#2c3e50',
                textAlign: 'center',
                lineHeight: 1.1,
                maxWidth: '95%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
                {item.description}
              </span>
              <span style={{
                fontSize: isMobile ? '0.6em' : '1em',
                fontWeight: 'bold',
                color: isEntree ? '#3498db' : '#ffa500',
                marginTop: isMobile ? '1px' : '5px'
              }}>
                {isCredit ? (isEntree ? '-' : '+') : (isEntree ? '+' : '-')}{formatMontantShort(item.montant)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLinkedBubbles = () => {
    if (findLinkedItems.length === 0) return null;
    
    const isExpanded = expandedSection === 'linked';
    
    // 📱 Mobile: positionner à gauche des cercles centraux
    const mobileLinkedStyles = isMobile ? {
      position: 'absolute',
      top: '42%',
      left: '10px',
      transform: 'translateY(-50%)',
      width: 'auto',
      height: 'auto',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    } : {
      position: 'absolute',
      top: '55px',
      left: '15%',
      right: '15%',
      height: isExpanded ? '180px' : '70px',
      zIndex: 100,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      gap: '25px',
      flexWrap: 'wrap',
      paddingTop: '5px'
    };
    
    return (
      <div
        onMouseEnter={() => setExpandedSection('linked')}
        onMouseLeave={() => setExpandedSection(null)}
        onClick={(e) => { 
          e.stopPropagation(); 
          if (isMobile && !isExpanded) setExpandedSection('linked'); 
        }}
        style={{
          ...mobileLinkedStyles,
          background: isExpanded ? 'transparent' : 'transparent',
          borderRadius: '20px',
          boxShadow: 'none'
        }}
      >
        {!isExpanded && (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            cursor: 'pointer',
            background: 'transparent',
            borderRadius: isMobile ? '15px' : '50px',
            padding: isMobile ? '8px' : '10px 20px',
            border: 'none',
            boxShadow: 'none',
            backdropFilter: 'none'
          }}>
            <div style={{
              width: isMobile ? '35px' : '50px',
              height: isMobile ? '35px' : '50px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
              border: isMobile ? '2px solid white' : '3px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(52, 152, 219, 0.4)',
              zIndex: 2
            }}>
              <span style={{ color: 'white', fontSize: isMobile ? '0.9em' : '1.3em' }}>🔗</span>
            </div>
            <div style={{
              width: isMobile ? '35px' : '50px',
              height: isMobile ? '35px' : '50px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
              border: isMobile ? '2px solid white' : '3px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: isMobile ? '0' : '-18px',
              marginTop: isMobile ? '-10px' : '0',
              zIndex: 1
            }}>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: isMobile ? '0.85em' : '1.1em' }}>{findLinkedItems.length}</span>
            </div>
          </div>
        )}

        {isExpanded && findLinkedItems.map((link, index) => {
          // Tooltip pour transfert lié
          const frequenceLabel = t(`budget.frequencies.${link.entree.frequence}`, link.entree.frequence);
          const transferTooltip = `${t('budget.transfers')}: ${formatMontant(link.entree.montant)}/${frequenceLabel} - ${link.entree.compte} → ${link.sortie.compte}`;
          
          return (
          <div
            key={`linked-${index}`}
            title={transferTooltip}
            className="bubble-new"
            onClick={(e) => { e.stopPropagation(); handleEdit(link.entree, 'entrees', link.entreeIndex, { item: link.sortie, index: link.sortieIndex }); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              background: 'transparent',
              borderRadius: '25px',
              padding: '8px',
              border: '3px solid rgba(255,255,255,0.5)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, rgba(52, 152, 219, 0.9), rgba(41, 128, 185, 0.95), rgba(52, 152, 219, 1))',
              border: '4px solid rgba(255,255,255,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)',
              zIndex: 2,
              padding: '10px',
              boxSizing: 'border-box'
            }}>
              <span style={{ fontSize: '0.8em', fontWeight: '600', color: 'white', textAlign: 'center', maxWidth: '85%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {link.entree.description?.split('-')[0]?.trim() || 'Entrée'}
              </span>
              <span style={{ fontSize: '0.7em', color: 'rgba(255,255,255,0.8)', marginTop: '2px', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {link.entree.compte?.split('-')[0] || ''}
              </span>
              <span style={{ fontSize: '0.95em', fontWeight: 'bold', color: 'white', marginTop: '3px', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                +{formatMontantShort(link.entree.montant)}
              </span>
            </div>
            
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, rgba(255, 183, 77, 1), rgba(255, 152, 0, 0.95), rgba(255, 165, 0, 1))',
              border: '4px solid rgba(255,255,255,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(255, 165, 0, 0.3)',
              marginLeft: '-35px',
              zIndex: 1,
              padding: '10px',
              boxSizing: 'border-box'
            }}>
              <span style={{ fontSize: '0.8em', fontWeight: '600', color: 'white', textAlign: 'center', maxWidth: '85%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {link.sortie.description?.split('-')[0]?.trim() || 'Sortie'}
              </span>
              <span style={{ fontSize: '0.7em', color: 'rgba(255,255,255,0.8)', marginTop: '2px', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {link.sortie.compte?.split('-')[0] || ''}
              </span>
              <span style={{ fontSize: '0.95em', fontWeight: 'bold', color: 'white', marginTop: '3px', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                -{formatMontantShort(link.sortie.montant)}
              </span>
            </div>
          </div>
          );
        })}
      </div>
    );
  };

  // ===== RÉPARTITION PAR COMPTE =====
  const accountBreakdown = useMemo(() => {
    const calcMensuel = (montant, frequence) => {
      const m = parseFloat(montant) || 0;
      if (frequence === '1-fois') return 0;
      switch (frequence) {
        case 'hebdomadaire': return m * 4;
        case 'quinzaine': case 'bimensuel': return m * 2;
        case 'trimestriel': return m / 3;
        case 'semestriel': return m / 6;
        case 'annuel': return m / 12;
        default: return m;
      }
    };
    
    const map = {};
    const addToMap = (items, type) => {
      (items || []).forEach(item => {
        if (item.dateFinRecurrence) {
          const fin = new Date(item.dateFinRecurrence);
          const now = new Date(); now.setHours(0,0,0,0);
          if (fin < now) return;
        }
        const key = item.compte || (i18n.language === 'fr' ? 'Sans compte' : 'No account');
        if (!map[key]) map[key] = { nom: key, entrees: 0, sorties: 0, type: 'checking' };
        const mensuel = calcMensuel(item.montant, item.frequence);
        if (type === 'entrees') map[key].entrees += mensuel;
        else map[key].sorties += mensuel;
      });
    };
    addToMap(entrees, 'entrees');
    addToMap(sorties, 'sorties');
    
    // Enrichir avec le type de compte
    Object.values(map).forEach(acc => {
      const found = accounts.find(a => a.nom === acc.nom);
      if (found) acc.type = found.type || 'checking';
    });
    
    return Object.values(map).sort((a, b) => (b.entrees - b.sorties) - (a.entrees - a.sorties));
  }, [entrees, sorties, accounts, i18n.language]);

  // Lire le paramètre ?account= pour navigation depuis Comptes
  useEffect(() => {
    const accountParam = searchParams.get('account');
    if (accountParam && accountBreakdown.length > 0) {
      const found = accountBreakdown.find(a => a.nom === accountParam);
      if (found) {
        setShowBreakdown(true);
        setSelectedAccount(accountParam);
        if (!isMobile) setIsFullScreen(true);
      }
      // Nettoyer l'URL
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, accountBreakdown]);

  const renderAccountBreakdown = () => {
    const totalNet = accountBreakdown.reduce((s, a) => s + (a.entrees - a.sorties), 0);
    const maxVal = Math.max(...accountBreakdown.map(a => Math.max(a.entrees, a.sorties)), 1);
    
    const getAccountIcon = (type) => {
      switch (type) {
        case 'credit': return '🏦';
        case 'epargne': return '🌱';
        case 'hypotheque': return '🏠';
        default: return '💳';
      }
    };
    const getAccountLabel = (type) => {
      if (i18n.language === 'fr') {
        switch (type) {
          case 'credit': return 'Crédit';
          case 'epargne': return 'Épargne';
          case 'hypotheque': return 'Hypothèque';
          default: return 'Chèque';
        }
      } else {
        switch (type) {
          case 'credit': return 'Credit';
          case 'epargne': return 'Savings';
          case 'hypotheque': return 'Mortgage';
          default: return 'Checking';
        }
      }
    };
    
    return (
      <div style={{ position: 'absolute', inset: 0, padding: isMobile ? '15px' : '25px 30px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 16 : 24 }}>
          <div>
            <h3 style={{ margin: 0, color: isDark ? 'white' : '#1e293b', fontSize: isMobile ? '1em' : '1.15em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚖️ {i18n.language === 'fr' ? 'Répartition par compte' : 'Breakdown by account'}
            </h3>
          </div>
        </div>

        {/* Cartes comptes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14 }}>
          {accountBreakdown.map((acc, i) => {
            const isCredit = acc.type === 'credit' || acc.type === 'hypotheque';
            // Crédit: net = dépenses - paiements (négatif = on paie plus = vert)
            const displayNet = isCredit ? (acc.sorties - acc.entrees) : (acc.entrees - acc.sorties);
            const barPlus = isCredit ? acc.sorties : acc.entrees;
            const barMinus = isCredit ? acc.entrees : acc.sorties;
            const netColor = isCredit ? (displayNet <= 0 ? '#2ecc71' : '#ffa500') : (displayNet >= 0 ? '#2ecc71' : '#ffa500');
            return (
              <div key={i} onClick={() => setSelectedAccount(acc.nom)} style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                borderRadius: 16,
                padding: isMobile ? '14px 16px' : '18px 20px',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = isDark ? 'rgba(102,126,234,0.4)' : 'rgba(102,126,234,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';
                e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
              }}>
                {/* Nom + Net */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1em'
                    }}>
                      {getAccountIcon(acc.type)}
                    </div>
                    <div>
                      <span style={{ color: isDark ? 'white' : '#1e293b', fontWeight: 600, fontSize: isMobile ? '0.85em' : '0.95em' }}>{acc.nom}</span>
                      <span style={{ display: 'block', color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8', fontSize: '0.75em' }}>{getAccountLabel(acc.type)}</span>
                    </div>
                  </div>
                  <span style={{ color: netColor, fontWeight: 'bold', fontSize: isMobile ? '1em' : '1.1em' }}>
                    {displayNet >= 0 ? '+' : '-'}{formatMontant(displayNet)}
                  </span>
                </div>
                {/* Barre + */}
                {barPlus > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: '#3498db', fontSize: '0.7em', width: 10, textAlign: 'center' }}>+</span>
                    <div style={{ flex: 1, height: 8, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(barPlus / maxVal) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #3498db, #2ecc71)', borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b', fontSize: '0.75em', width: 65, textAlign: 'right' }}>{formatMontant(barPlus)}</span>
                  </div>
                )}
                {/* Barre - */}
                {barMinus > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#ffa500', fontSize: '0.7em', width: 10, textAlign: 'center' }}>−</span>
                    <div style={{ flex: 1, height: 8, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(barMinus / maxVal) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #ffa500, #e74c3c)', borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b', fontSize: '0.75em', width: 65, textAlign: 'right' }}>{formatMontant(barMinus)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAccountDetail = () => {
    if (!selectedAccount) return null;
    
    const accData = accountBreakdown.find(a => a.nom === selectedAccount);
    const isCredit = accData && (accData.type === 'credit' || accData.type === 'hypotheque');
    
    const calcMensuel = (montant, frequence) => {
      const m = parseFloat(montant) || 0;
      if (frequence === '1-fois') return 0;
      switch (frequence) {
        case 'hebdomadaire': return m * 4;
        case 'quinzaine': case 'bimensuel': return m * 2;
        case 'trimestriel': return m / 3;
        case 'semestriel': return m / 6;
        case 'annuel': return m / 12;
        default: return m;
      }
    };
    
    const isActive = (item) => {
      if (item.dateFinRecurrence) {
        const fin = new Date(item.dateFinRecurrence);
        const now = new Date(); now.setHours(0,0,0,0);
        if (fin < now) return false;
      }
      return true;
    };
    
    const accountEntrees = entrees
      .filter(e => (e.compte || '') === selectedAccount && isActive(e))
      .map(e => ({ description: e.description, montant: calcMensuel(e.montant, e.frequence), frequence: e.frequence }))
      .filter(e => e.montant > 0)
      .sort((a, b) => b.montant - a.montant);
    
    const accountSorties = sorties
      .filter(s => (s.compte || '') === selectedAccount && isActive(s))
      .map(s => ({ description: s.description, montant: calcMensuel(s.montant, s.frequence), frequence: s.frequence }))
      .filter(s => s.montant > 0)
      .sort((a, b) => b.montant - a.montant);
    
    // Crédit: gauche = sorties (dépenses), droite = entrées (paiements)
    // Normal: gauche = entrées (+), droite = sorties (-)
    const leftItems = isCredit ? accountSorties : accountEntrees;
    const rightItems = isCredit ? accountEntrees : accountSorties;
    const leftLabel = isCredit 
      ? (i18n.language === 'fr' ? 'Dépenses' : 'Expenses')
      : (i18n.language === 'fr' ? 'Entrées' : 'Income');
    const rightLabel = isCredit 
      ? (i18n.language === 'fr' ? 'Paiements' : 'Payments')
      : (i18n.language === 'fr' ? 'Sorties' : 'Expenses');
    const leftTotal = leftItems.reduce((s, i) => s + i.montant, 0);
    const rightTotal = rightItems.reduce((s, i) => s + i.montant, 0);
    
    const getAccountIcon = (type) => {
      switch (type) {
        case 'credit': return '🏦';
        case 'epargne': return '🌱';
        case 'hypotheque': return '🏠';
        default: return '💳';
      }
    };
    
    const renderColumn = (items, total, label, color) => (
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 12, textAlign: 'center' }}>
          <span style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#94a3b8', fontSize: '0.8em', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
          <p style={{ margin: '4px 0 0', color, fontWeight: 'bold', fontSize: isMobile ? '1.1em' : '1.3em' }}>{formatMontant(total)}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, idx) => {
            const pct = total > 0 ? (item.montant / total) * 100 : 0;
            return (
              <div key={idx} style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                borderRadius: 12,
                padding: isMobile ? '10px 12px' : '12px 14px',
                border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ color: isDark ? 'white' : '#1e293b', fontSize: isMobile ? '0.8em' : '0.85em', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>{item.description}</span>
                  <span style={{ color, fontSize: isMobile ? '0.8em' : '0.85em', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatMontant(item.montant)}</span>
                </div>
                <div style={{ height: 4, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <p style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#cbd5e1', fontSize: '0.85em', textAlign: 'center', fontStyle: 'italic', margin: '20px 0' }}>
              {i18n.language === 'fr' ? 'Aucun élément' : 'No items'}
            </p>
          )}
        </div>
      </div>
    );
    
    return (
      <div style={{ position: 'absolute', inset: 0, padding: isMobile ? '15px' : '25px 30px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isMobile ? 16 : 24 }}>
          <span style={{ fontSize: '1.2em' }}>{accData ? getAccountIcon(accData.type) : '💳'}</span>
          <h3 style={{ margin: 0, color: isDark ? 'white' : '#1e293b', fontSize: isMobile ? '1em' : '1.15em' }}>{selectedAccount}</h3>
        </div>
        
        {/* Colonnes */}
        <div style={{ display: 'flex', gap: isMobile ? 12 : 20 }}>
          {renderColumn(leftItems, leftTotal, leftLabel, '#3498db')}
          {/* Séparateur */}
          <div style={{ width: 1, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', alignSelf: 'stretch', margin: '30px 0 0' }} />
          {renderColumn(rightItems, rightTotal, rightLabel, '#ffa500')}
        </div>
      </div>
    );
  };

  const renderPlatformContent = () => (
    <div onClick={() => { if (isMobile && expandedSection) setExpandedSection(null); }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Cercle externe avec pulse orange/doré */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: isMobile ? '42%' : '58%',
        transform: 'translate(-50%, -50%)',
        width: isMobile ? '280px' : (isFullScreen ? '520px' : '420px'),
        height: isMobile ? '280px' : (isFullScreen ? '520px' : '420px'),
        borderRadius: '50%',
        border: '3px solid transparent',
        background: isDark 
          ? 'linear-gradient(#040449, #100261) padding-box, linear-gradient(180deg, #ffd70060, #ff8c0040, #ff450030, #ffd70060) border-box'
          : 'linear-gradient(#ffffff, #f8fafc) padding-box, linear-gradient(180deg, #ffd700a0, #ff8c0080, #ff450070, #ffd700a0) border-box',
        animation: 'pulse-glow 3s ease-in-out infinite',
        pointerEvents: 'none',
        boxShadow: '0 0 30px rgba(255, 165, 0, 0.15)'
      }} />
      {/* Cercle interne avec pulse orange/doré */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: isMobile ? '42%' : '58%',
        transform: 'translate(-50%, -50%)',
        width: isMobile ? '230px' : (isFullScreen ? '440px' : '350px'),
        height: isMobile ? '230px' : (isFullScreen ? '440px' : '350px'),
        borderRadius: '50%',
        border: '4px solid transparent',
        background: isDark 
          ? 'linear-gradient(#040449, #100261) padding-box, linear-gradient(180deg, #ffd70080, #ff8c0060, #ff450050, #ffd70080) border-box'
          : 'linear-gradient(#ffffff, #f8fafc) padding-box, linear-gradient(180deg, #ffd700c0, #ff8c00a0, #ff450090, #ffd700c0) border-box',
        animation: 'pulse-glow 3s ease-in-out infinite 0.4s',
        pointerEvents: 'none',
        boxShadow: '0 0 40px rgba(255, 165, 0, 0.2)'
      }} />

      <div style={{
        position: 'absolute',
        left: '50%',
        top: isMobile ? '42%' : '58%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        zIndex: 20
      }}>
      <div 
          data-tooltip="balance"
          style={{
            display: 'inline-block',
            padding: '15px 40px',
            borderRadius: '16px'
          }}
        >
        <p style={{ color: isDark ? 'rgba(255,255,255,0.8)' : '#64748b', fontSize: isMobile ? '0.8em' : '0.95em', margin: '0 0 8px', fontWeight: '600' }}>{t('budget.monthlyBalance')}</p>
        <p 
          style={{
            fontSize: isMobile ? '1.8em' : (isFullScreen ? '2.8em' : '2.4em'),
            fontWeight: 'bold',
            margin: isMobile ? '0 0 12px' : '0 0 20px',
            color: budgetSummary.balance >= 0 ? '#3498db' : '#ffa500',
            textShadow: isDark ? '0 2px 10px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          {!balancesHidden ? (budgetSummary.balance >= 0 ? '+' : '') + formatMontant(budgetSummary.balance) : '••••••'}
        </p>
        </div>
        
        {/* Message empty state */}
        {entrees.length === 0 && sorties.length === 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
            border: '2px solid #667eea40',
            borderRadius: '16px',
            padding: '12px 20px',
            marginBottom: '15px',
            maxWidth: '280px'
          }}>
            <p style={{ margin: 0, fontSize: '0.9em', color: '#667eea', fontWeight: '600' }}>
              {t('budget.emptyState.title')}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '0.8em', color: '#64748b' }}>
              {t('budget.emptyState.message')}
            </p>
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? '15px' : '20px' }}>
          <button
            type="button"
            title={t('budget.addEntry')}
            className={entrees.length === 0 ? 'add-button-pulse' : ''}
            onClick={(e) => { e.stopPropagation(); openAddForm('entrees'); }}
            style={{
              width: isMobile ? '42px' : '55px', height: isMobile ? '42px' : '55px', borderRadius: '50%',
              border: '3px solid #3498db',
              background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
              color: 'white', fontSize: isMobile ? '1.5em' : '2em', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(52, 152, 219, 0.4)', transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >+</button>
          
          <button
            type="button"
            title={t('budget.addExpense')}
            onClick={(e) => { e.stopPropagation(); openAddForm('sorties'); }}
            style={{
              width: isMobile ? '42px' : '55px', height: isMobile ? '42px' : '55px', borderRadius: '50%',
              border: '3px solid #ffa500',
              background: 'linear-gradient(135deg, #ffa500 0%, #ff8c00 100%)',
              color: 'white', fontSize: isMobile ? '1.5em' : '2em', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(255, 165, 0, 0.4)', transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >−</button>
        </div>
      </div>

      {renderBubbles(unlinkedEntrees, 'entrees', allEntreesMontants, unlinkedEntreesIndexes, 0)}
      {renderBubbles(unlinkedSorties, 'sorties', allSortiesMontants, unlinkedSortiesIndexes, unlinkedEntrees.length)}
      {renderLinkedBubbles()}
    </div>
  );

  return (
    <>
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
      {/* ZONE DE NOTIFICATIONS - Barre "On continue!" après le modal */}
      <div style={{
        background: showContinueBar 
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : (isDark ? '#040449' : '#ffffff'),
        padding: showContinueBar ? '15px 25px' : '12px 25px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'white',
        borderTopLeftRadius: '50px',
        minHeight: '60px',
        transition: 'all 0.3s ease'
      }}>
        {showContinueBar ? (
          // Barre "On continue!" après fermeture du modal
          <>
            <div style={{ flex: 1 }} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                continueToNextPage();
              }}
              style={{
                background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                border: 'none',
                borderRadius: '25px',
                padding: '12px 25px',
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
          </>
        ) : (
          // Zone vide (espace réservé pour futures notifications)
          <div style={{ width: '100%' }} />
        )}
      </div>
      
      {/* PAGE GUIDE MODAL - Modal popup pour l'onboarding */}
      <PageGuideModal
        isOpen={showGuide}
        onClose={closeModal}
        icon="📊"
        titleKey="budget.guideModal.title"
        messageKey="budget.guideModal.message"
        hintIcon="💰"
        hintKey="budget.guideModal.hint"
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
      
      {/* CONTENEUR BLANC pour le reste du contenu */}
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', background: isDark ? 'linear-gradient(180deg, #040449 0%, #100261 100%)' : '#ffffff', transition: 'background 0.3s ease' }}>
      {/* Overlay transparent pour capturer tous les clics en mode normal */}
      {/* Caché pendant le tooltip tour pour permettre la détection des éléments */}
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
      <style>{`
        @keyframes pulse-glow {
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
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.02); }
        }
        @keyframes bounce-in { 0% { transform: scale(0.9); opacity: 0; } 50% { transform: scale(1.02); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-8px); } 80% { transform: translateX(8px); } }
        @keyframes button-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4); }
          50% { transform: scale(1.08); box-shadow: 0 6px 25px rgba(52, 152, 219, 0.6); }
        }
        .add-button-pulse {
          animation: button-pulse 1.5s ease-in-out infinite;
        }
        @keyframes celebration-pop {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.1); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-100px) rotate(720deg); opacity: 0; }
        }
        @keyframes bubble-pop-in {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.15); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        .bubble-new {
          animation: bubble-pop-in 0.4s ease-out;
        }
        .modal-overlay { animation: fade-in 0.2s ease; }
        .modal-content { animation: bounce-in 0.3s ease; }
        .delete-icon { animation: shake 0.5s ease; }
        
        /* 🆕 Scrollbar personnalisé orange */
        .modal-content::-webkit-scrollbar {
          width: 8px;
        }
        .modal-content::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .modal-content::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #ffa500 0%, #ff8c00 100%);
          border-radius: 10px;
        }
        .modal-content::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #ffb732 0%, #ffa500 100%);
        }
        /* Firefox */
        .modal-content {
          scrollbar-width: thin;
          scrollbar-color: #ffa500 rgba(255, 255, 255, 0.1);
        }
        
        /* 🆕 Scrollbar pour les suggestions */
        .suggestions-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .suggestions-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .suggestions-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #ffa500 0%, #ff8c00 100%);
          border-radius: 10px;
        }
        .suggestions-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #ffb732 0%, #ffa500 100%);
        }
        
        /* 🆕 Animations bulles flottantes */
        @keyframes floatBubble0 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        @keyframes floatBubble1 {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(-10px) translateX(5px); }
          66% { transform: translateY(5px) translateX(-5px); }
        }
        @keyframes floatBubble2 {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.1) translateY(-8px); }
        }
        
        /* 🆕 Placeholders en italique */
        .modal-content input::placeholder {
          font-style: italic;
          opacity: 0.7;
        }
        
        /* 🆕 Message mobile - visible seulement sur écrans < 768px */
        @media (max-width: 768px) {
          .mobile-hint {
            display: block !important;
          }
          /* Masquer les bulles flottantes sur mobile */
          .floating-bubbles-container {
            display: none !important;
          }
        }
      `}</style>

      {/* Plateforme Radar */}
      <div 
        onClick={() => setIsFullScreen(true)}
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          background: 'transparent',
          overflow: 'hidden',
          cursor: 'pointer',
          padding: '20px'
        }}
      >
        {/* Header */}
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '20px'
        }}>
          <h1 style={{ 
            fontSize: isMobile ? '1.3em' : '1.8em', 
            fontWeight: 'bold', 
            color: isDark ? 'white' : '#1e293b', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            margin: 0
          }}>
            📋 {t('budget.title')}
          </h1>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            {budgetSummary.budgetJournalier !== 0 && (
              <div 
                title={`${formatMontant(budgetSummary.balance)} ÷ ${budgetSummary.joursRestants} ${t('budget.daysRemaining')} = ${formatMontant(budgetSummary.budgetJournalier)}/${t('common.day')}`}
                style={{ 
                background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', 
                borderRadius: '10px', 
                padding: isMobile ? '6px 12px' : '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '6px' : '8px',
                boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)',
                cursor: 'help'
              }}>
                <span style={{ fontSize: isMobile ? '0.7em' : '0.8em', color: 'rgba(255,255,255,0.9)' }}>📅 {t('budget.dailyBudget')}</span>
                <span style={{ fontSize: isMobile ? '0.9em' : '1.1em', fontWeight: 'bold', color: 'white' }}>{formatMontant(budgetSummary.budgetJournalier)}</span>
              </div>
            )}
          </div>
        </div>

        {/* === SLIDE CONTAINER === */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {/* Slide 0: Cercles budget */}
          <div style={{
            position: 'absolute', inset: 0,
            transform: showBreakdown ? 'translateX(-100%)' : 'translateX(0)',
            opacity: showBreakdown ? 0 : 1,
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            {renderPlatformContent()}
          </div>
          {/* Slide 1: Répartition par compte */}
          <div style={{
            position: 'absolute', inset: 0,
            transform: !showBreakdown ? 'translateX(100%)' : (selectedAccount ? 'translateX(-100%)' : 'translateX(0)'),
            opacity: !showBreakdown ? 0 : (selectedAccount ? 0 : 1),
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            {renderAccountBreakdown()}
          </div>
          {/* Slide 2: Détail du compte */}
          <div style={{
            position: 'absolute', inset: 0,
            transform: selectedAccount ? 'translateX(0)' : 'translateX(100%)',
            opacity: selectedAccount ? 1 : 0,
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            {renderAccountDetail()}
          </div>
        </div>

        
      </div>

      {/* MODE PLEIN ÉCRAN */}
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
            transition: 'background 0.3s ease'
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
          <div style={{ 
            padding: isMobile ? '10px 15px' : '15px 30px',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ 
                fontSize: isMobile ? '1.3em' : '1.8em', 
                fontWeight: 'bold', 
                color: isDark ? 'white' : '#1e293b', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                margin: isMobile && isPWA ? '5px 0 0 0' : (isMobile ? '15px 0 0 0' : '25px 0 0 0')
              }}>
                📋 {t('budget.title')}
              </h1>
              
              {/* 📱 PWA/Mobile: Bouton "On continue!" dans le header */}
              {isMobile && showContinueBar && (
                <button
                  onClick={continueToNextPage}
                  style={{
                    background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.85em',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(255, 152, 0, 0.4)',
                    whiteSpace: 'nowrap',
                    marginTop: isMobile && isPWA ? '5px' : (isMobile ? '15px' : '25px')
                  }}
                >
                  {t('common.onContinue')} →
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '10px' : '15px', marginTop: isMobile && isPWA ? '5px' : (isMobile ? '15px' : '25px') }}>
              {budgetSummary.budgetJournalier !== 0 && (
                <div 
                  title={`${formatMontant(budgetSummary.balance)} ÷ ${budgetSummary.joursRestants} ${t('budget.daysRemaining')} = ${formatMontant(budgetSummary.budgetJournalier)}/${t('common.day')}`}
                  style={{ 
                  background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', 
                  borderRadius: '10px', 
                  padding: isMobile ? '6px 12px' : '10px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '6px' : '10px',
                  boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)',
                  cursor: 'help'
                }}>
                  <span style={{ fontSize: isMobile ? '0.7em' : '0.9em', color: 'rgba(255,255,255,0.9)' }}>📅 {t('budget.dailyBudget')}</span>
                  <span style={{ fontSize: isMobile ? '0.95em' : '1.2em', fontWeight: 'bold', color: 'white' }}>{formatMontant(budgetSummary.budgetJournalier)}</span>
                </div>
              )}
              
              {/* 📱 Mobile: Boutons X et Œil en colonne verticale */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                {!showBreakdown && (
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (isMobile) {
                      // Mobile: ouvrir le menu sidebar
                      window.dispatchEvent(new CustomEvent('openSidebar'));
                    } else {
                      setIsFullScreen(false);
                    }
                  }}
                  style={{
                    width: isMobile ? '36px' : '40px',
                    height: isMobile ? '36px' : '40px',
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
                )}
                
                {/* Bouton Œil pour masquer/afficher les soldes */}
                <button
                  onClick={toggleBalances}
                  title={balancesHidden ? t('budget.showBalances') : t('budget.hideBalances')}
                  style={{
                    borderRadius: '50%',
                    width: isMobile ? '36px' : '40px',
                    height: isMobile ? '36px' : '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: isMobile ? '1em' : '1.2em',
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
                
                {/* Bouton répartition par compte / retour */}
                {(entrees.length > 0 || sorties.length > 0) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedAccount) {
                        setSelectedAccount(null);
                      } else if (showBreakdown) {
                        setShowBreakdown(false);
                      } else {
                        setShowBreakdown(true);
                      }
                    }}
                    title={(showBreakdown || selectedAccount) ? (i18n.language === 'fr' ? 'Retour' : 'Back') : (i18n.language === 'fr' ? 'Répartition par compte' : 'Breakdown by account')}
                    style={{
                      borderRadius: '50%',
                      width: isMobile ? '36px' : '40px',
                      height: isMobile ? '36px' : '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: isMobile ? '1em' : '1.2em',
                      transition: 'all 0.3s',
                      border: showBreakdown
                        ? (isDark ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(0,0,0,0.2)')
                        : (isDark ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(0,0,0,0.2)'),
                      background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      color: isDark ? 'white' : '#64748b',
                      boxShadow: 'none'
                    }}
                  >
                    {(showBreakdown || selectedAccount) ? '⬅' : '⚖️'}
                  </button>
                )}
                
              </div>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative', background: 'transparent', overflow: 'hidden' }}>
            {/* === SLIDE CONTAINER FULLSCREEN === */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
              {/* Slide 0: Cercles budget */}
              <div style={{
                position: 'absolute', inset: 0,
                transform: showBreakdown ? 'translateX(-100%)' : 'translateX(0)',
                opacity: showBreakdown ? 0 : 1,
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                {renderPlatformContent()}
              </div>
              {/* Slide 1: Répartition par compte */}
              <div style={{
                position: 'absolute', inset: 0,
                transform: !showBreakdown ? 'translateX(100%)' : (selectedAccount ? 'translateX(-100%)' : 'translateX(0)'),
                opacity: !showBreakdown ? 0 : (selectedAccount ? 0 : 1),
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                {renderAccountBreakdown()}
              </div>
              {/* Slide 2: Détail du compte */}
              <div style={{
                position: 'absolute', inset: 0,
                transform: selectedAccount ? 'translateX(0)' : 'translateX(100%)',
                opacity: selectedAccount ? 1 : 0,
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                {renderAccountDetail()}
              </div>
            </div>
            
            {/* 💡 Bouton d'aide - Relancer le guide */}
            {isGuideComplete && !showBreakdown && (
              <button
                onClick={() => {
                  isManualTourRef.current = true;
                  resetTooltips();
                  setTimeout(() => startTooltipTour(), 100);
                }}
                style={{
                  position: 'fixed',
                  bottom: '24px',
                  right: '24px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '32px',
                  cursor: 'pointer',
                  zIndex: 1000,
                  padding: '8px',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                title={t('common.helpGuide', 'Aide - Voir le guide de la page')}
              >
                💡
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {deleteConfirm && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1002, padding: '20px' }}>
          <div className="modal-content" style={{ background: 'linear-gradient(180deg, #040449 0%, #100261 100%)', borderRadius: '20px', padding: '30px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', textAlign: 'center', border: '2px solid rgba(255,165,0,0.3)' }}>
            <div className="delete-icon" style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #ff6b6b 0%, #e74c3c 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '2.5em' }}>🗑️</div>
            <h2 style={{ fontSize: '1.4em', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>{t('budget.deleteConfirm.title')}</h2>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '15px', marginBottom: '20px' }}>
              <p style={{ fontSize: '1.1em', fontWeight: 'bold', color: 'white', margin: '0 0 5px' }}>{deleteConfirm.item.description}</p>
              <p style={{ fontSize: '1.2em', fontWeight: 'bold', color: deleteConfirm.type === 'entrees' ? '#3498db' : '#ffa500', margin: '0' }}>
                {deleteConfirm.type === 'entrees' ? '+' : '-'}{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(Math.abs(deleteConfirm.item.montant))}
              </p>
              {deleteConfirm.linkedInfo && (
                <p style={{ fontSize: '0.85em', color: '#ffa500', marginTop: '10px', fontWeight: '600' }}>
                  ⚠️ {t('budget.deleteConfirm.linkedWarning')}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '10px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>{t('common.cancel')}</button>
              <button type="button" onClick={handleDeleteConfirm} style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(180deg, #040449 0%, #100261 100%)', borderRadius: '20px', padding: '30px', maxWidth: '500px', width: '100%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '2px solid rgba(255,165,0,0.3)' }}>
            <h2 style={{ fontSize: '1.3em', fontWeight: 'bold', color: 'white', marginBottom: '20px' }}>
              ✏️ {editingType === 'entrees' ? t('budget.modal.editEntry') : t('budget.modal.editExpense')}
              {editingLinkedItem && <span style={{ fontSize: '0.7em', color: '#3498db', marginLeft: '8px' }}>🔗 {t('budget.modal.linked')}</span>}
            </h2>
            
            {editingLinkedItem && (
              <div style={{ background: 'rgba(52, 152, 219, 0.2)', border: '2px solid #3498db', borderRadius: '10px', padding: '12px', marginBottom: '15px', fontSize: '0.85em' }}>
                <p style={{ margin: 0, color: '#3498db', fontWeight: '600' }}>🔗 {t('budget.modal.linkedItem')}: {editingLinkedItem.item.description}</p>
                <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.9em' }}>{t('budget.modal.linkedModification')}</p>
              </div>
            )}
            
            {renderForm()}
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
              <button type="button" onClick={handleCancel} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '10px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>{t('common.cancel')}</button>
              <button type="button" onClick={() => handleDeleteRequest(editingType, editingIndex, editingItem, editingLinkedItem)} style={{ padding: '14px 20px', background: 'rgba(231,76,60,0.2)', border: '2px solid #e74c3c', borderRadius: '10px', color: '#e74c3c', fontWeight: '600', cursor: 'pointer' }}>🗑️</button>
              <button type="button" onClick={handleSave} style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          
          {/* 🆕 Bulles flottantes = SUGGESTIONS CLIQUABLES (Desktop seulement) */}
          <div className="floating-bubbles-container" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* Bulles côté gauche - 6 suggestions */}
            {(addType === 'entrees' ? [
              { icon: '💰', label: t('budget.suggestions.entries.0.label', 'Salaire'), top: '12%', left: '23%', size: 85 },
              { icon: '👶', label: t('budget.suggestions.entries.1.label', 'Allocation canadienne'), top: '30%', left: '25%', size: 80 },
              { icon: '🏠', label: t('budget.suggestions.entries.2.label', 'Revenus locatifs'), top: '48%', left: '24%', size: 75 },
              { icon: '💼', label: t('budget.suggestions.entries.3.label', 'Freelance'), top: '65%', left: '26%', size: 70 },
              { icon: '📊', label: t('budget.suggestions.entries.4.label', 'Dividendes'), top: '80%', left: '23%', size: 65 },
              { icon: '💵', label: t('budget.suggestions.entries.8.label', 'Pension'), top: '92%', left: '28%', size: 60 }
            ] : [
              { icon: '🏠', label: t('budget.suggestions.expenses.0.label', 'Loyer'), top: '12%', left: '23%', size: 85 },
              { icon: '🛒', label: t('budget.suggestions.expenses.1.label', 'Épicerie'), top: '30%', left: '25%', size: 80 },
              { icon: '📱', label: t('budget.suggestions.expenses.2.label', 'Téléphone'), top: '48%', left: '24%', size: 75 },
              { icon: '⛽', label: t('budget.suggestions.expenses.4.label', 'Essence'), top: '65%', left: '26%', size: 70 },
              { icon: '💡', label: t('budget.suggestions.expenses.5.label', 'Hydro'), top: '80%', left: '23%', size: 65 },
              { icon: '🚗', label: t('budget.suggestions.expenses.7.label', 'Auto'), top: '92%', left: '28%', size: 60 }
            ]).map((bubble, i) => (
              <div 
                key={`left-${i}`} 
                className="floating-bubble" 
                onClick={() => setFormData({...formData, description: bubble.label})}
                title={bubble.label}
                style={{
                  position: 'absolute',
                  top: bubble.top,
                  left: bubble.left,
                  width: `${bubble.size}px`,
                  height: `${bubble.size}px`,
                  borderRadius: '50%',
                  background: addType === 'entrees' 
                    ? 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' 
                    : 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                  boxShadow: addType === 'entrees' 
                    ? '0 4px 20px rgba(52, 152, 219, 0.5)' 
                    : '0 4px 20px rgba(243, 156, 18, 0.5)',
                  animation: `floatBubble${i % 3} 4s ease-in-out infinite`,
                  animationDelay: `${i * 0.3}s`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  pointerEvents: 'auto'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.15)';
                  e.currentTarget.style.boxShadow = addType === 'entrees' 
                    ? '0 8px 30px rgba(52, 152, 219, 0.7)' 
                    : '0 8px 30px rgba(243, 156, 18, 0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = addType === 'entrees' 
                    ? '0 4px 20px rgba(52, 152, 219, 0.5)' 
                    : '0 4px 20px rgba(243, 156, 18, 0.5)';
                }}
              >
                <span style={{ fontSize: bubble.size > 55 ? '1.5em' : '1.2em' }}>{bubble.icon}</span>
                {bubble.size > 55 && (
                  <span style={{ 
                    fontSize: '0.65em', 
                    color: 'white', 
                    fontWeight: '600',
                    textAlign: 'center',
                    lineHeight: 1.1,
                    maxWidth: '90%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {bubble.label.length > 10 ? bubble.label.substring(0, 8) + '...' : bubble.label}
                  </span>
                )}
              </div>
            ))}
            
            {/* Bulles côté droit - 6 suggestions */}
            {(addType === 'entrees' ? [
              { icon: '🎁', label: t('budget.suggestions.entries.5.label', 'Cadeaux'), top: '15%', right: '24%', size: 80 },
              { icon: '💸', label: t('budget.suggestions.entries.6.label', 'Remboursements'), top: '38%', right: '26%', size: 75 },
              { icon: '🎰', label: t('budget.suggestions.entries.7.label', 'Loterie'), top: '60%', right: '23%', size: 70 }
            ] : [
              { icon: '🎬', label: t('budget.suggestions.expenses.3.label', 'Netflix'), top: '12%', right: '24%', size: 80 },
              { icon: '🏥', label: t('budget.suggestions.expenses.8.label', 'Assurances'), top: '30%', right: '26%', size: 75 },
              { icon: '🍽️', label: t('budget.suggestions.expenses.9.label', 'Restaurant'), top: '48%', right: '23%', size: 70 },
              { icon: '🏋️', label: t('budget.suggestions.expenses.10.label', 'Gym'), top: '65%', right: '27%', size: 65 },
              { icon: '💈', label: t('budget.suggestions.expenses.11.label', 'Coiffure'), top: '80%', right: '24%', size: 60 },
              { icon: '🎨', label: t('budget.suggestions.expenses.12.label', 'Loisirs'), top: '92%', right: '28%', size: 65 }
            ]).map((bubble, i) => (
              <div 
                key={`right-${i}`} 
                className="floating-bubble" 
                onClick={() => setFormData({...formData, description: bubble.label})}
                title={bubble.label}
                style={{
                  position: 'absolute',
                  top: bubble.top,
                  right: bubble.right,
                  width: `${bubble.size}px`,
                  height: `${bubble.size}px`,
                  borderRadius: '50%',
                  background: addType === 'entrees' 
                    ? 'linear-gradient(135deg, #1abc9c 0%, #16a085 100%)' 
                    : 'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)',
                  boxShadow: addType === 'entrees' 
                    ? '0 4px 20px rgba(26, 188, 156, 0.5)' 
                    : '0 4px 20px rgba(241, 196, 15, 0.5)',
                  animation: `floatBubble${(i + 1) % 3} 4s ease-in-out infinite`,
                  animationDelay: `${(i + 6) * 0.3}s`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  pointerEvents: 'auto'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.15)';
                  e.currentTarget.style.boxShadow = addType === 'entrees' 
                    ? '0 8px 30px rgba(26, 188, 156, 0.7)' 
                    : '0 8px 30px rgba(241, 196, 15, 0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = addType === 'entrees' 
                    ? '0 4px 20px rgba(26, 188, 156, 0.5)' 
                    : '0 4px 20px rgba(241, 196, 15, 0.5)';
                }}
              >
                <span style={{ fontSize: bubble.size > 55 ? '1.5em' : '1.2em' }}>{bubble.icon}</span>
                {bubble.size > 55 && (
                  <span style={{ 
                    fontSize: '0.65em', 
                    color: 'white', 
                    fontWeight: '600',
                    textAlign: 'center',
                    lineHeight: 1.1,
                    maxWidth: '90%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {bubble.label.length > 10 ? bubble.label.substring(0, 8) + '...' : bubble.label}
                  </span>
                )}
              </div>
            ))}
          </div>
          
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(180deg, #040449 0%, #100261 100%)', borderRadius: '20px', padding: '30px', maxWidth: '500px', width: '100%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '2px solid rgba(255,165,0,0.3)', position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '1.3em', fontWeight: 'bold', color: 'white', marginBottom: '20px' }}>
              {addType === 'entrees' ? `✨ ${t('budget.modal.addEntry')}` : `➖ ${t('budget.modal.addExpense')}`}
            </h2>
            {renderForm()}
            {formData.compte && accounts.length > 1 && (
              <button type="button" onClick={handleLinkAccount} style={{ width: '100%', marginTop: '15px', padding: '14px 20px', background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', border: '2px solid rgba(255, 105, 180, 0.4)', borderRadius: '12px', color: 'white', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 15px rgba(155, 89, 182, 0.4), 0 0 20px rgba(255, 105, 180, 0.2)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 6px 25px rgba(155, 89, 182, 0.5), 0 0 30px rgba(255, 105, 180, 0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(155, 89, 182, 0.4), 0 0 20px rgba(255, 105, 180, 0.2)'; }}>
                🔗 {t('budget.modal.linkToAccount')}
              </button>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button type="button" onClick={handleCancel} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '10px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>{t('common.cancel')}</button>
              <button type="button" onClick={handleAdd} style={{ flex: 1, padding: '14px', background: addType === 'entrees' ? 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' : 'linear-gradient(135deg, #ffa500 0%, #ff8c00 100%)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>{t('common.add')}</button>
            </div>
          </div>
        </div>
      )}

      {showTransferPopup && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '20px' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(180deg, #040449 0%, #100261 100%)', borderRadius: '20px', padding: '30px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '2px solid rgba(255,165,0,0.3)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '3em', marginBottom: '15px' }}>🔗</div>
              <h2 style={{ fontSize: '1.3em', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>{t('budget.modal.linkAccount')}</h2>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '15px', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: 'white' }}>{formData.description || t('budget.modal.noDescription')}</p>
              <p style={{ margin: '3px 0 0', fontSize: '0.85em', color: 'rgba(255,255,255,0.7)' }}>{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(formData.montant || 0)}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {accounts.filter(a => a.nom !== formData.compte).map((acc, i) => (
                <button type="button" key={i} onClick={() => handleCreateLinkedEntry(acc.nom)} style={{ padding: '14px', background: 'rgba(52,152,219,0.2)', border: '2px solid #3498db', borderRadius: '12px', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#3498db'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(52,152,219,0.2)'; }}>
                  <span>{acc.type === 'hypotheque' ? '🏠' : acc.type === 'credit' ? '🏦' : acc.type === 'epargne' ? '🌱' : '💳'}</span>
                  <span style={{ flex: 1 }}>{acc.nom}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setShowTransferPopup(null)} style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '10px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
      
      {/* ========== POPUP OPTIMISATION ========== */}
      {showOptimizationPopup && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1002, padding: '20px' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(180deg, #040449 0%, #100261 100%)', borderRadius: '20px', padding: '30px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '2px solid rgba(255,165,0,0.3)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '3em', marginBottom: '10px' }}>♻️</div>
              <h2 style={{ fontSize: '1.2em', fontWeight: 'bold', color: 'white', marginBottom: '5px' }}>
                {t('budget.optimization.title') || 'Optimisation'}
              </h2>
              <p style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                {t('budget.optimization.subtitle') || 'Ajustez automatiquement ce budget selon votre trajectoire'}
              </p>
            </div>
            
            {/* Montant de base affiché */}
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '15px', marginBottom: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.8em', color: 'rgba(255,255,255,0.7)' }}>{t('budget.optimization.baseAmount') || 'Montant de base'}</p>
              <p style={{ margin: '5px 0 0', fontSize: '1.5em', fontWeight: 'bold', color: 'white' }}>{formData.montant || 0}$</p>
            </div>
            
            {/* Toggle Activer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', padding: '10px', background: formData.optimization?.enabled ? 'rgba(39, 174, 96, 0.2)' : 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
              <span style={{ fontWeight: '600', color: 'white' }}>{t('budget.optimization.enable') || "Activer l'optimisation"}</span>
              <button
                type="button"
                onClick={() => setFormData({
                  ...formData,
                  optimization: { ...formData.optimization, enabled: !formData.optimization?.enabled }
                })}
                style={{
                  width: '50px',
                  height: '28px',
                  borderRadius: '14px',
                  border: 'none',
                  background: formData.optimization?.enabled ? '#27ae60' : '#bdc3c7',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '3px',
                  left: formData.optimization?.enabled ? '25px' : '3px',
                  transition: 'left 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>
            
            {formData.optimization?.enabled && (
              <>
                {/* Type d'optimisation */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '0.85em', color: 'rgba(255,255,255,0.7)', marginBottom: '8px', fontWeight: '600' }}>
                    {t('budget.optimization.type') || "Type d'optimisation"}
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        optimization: { ...formData.optimization, type: 'amount' }
                      })}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: `2px solid ${formData.optimization?.type === 'amount' ? '#27ae60' : '#e0e0e0'}`,
                        background: formData.optimization?.type === 'amount' ? 'rgba(39, 174, 96, 0.1)' : 'white',
                        color: formData.optimization?.type === 'amount' ? '#27ae60' : '#7f8c8d',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      💵 {t('budget.optimization.fixedAmount') || 'Montant fixe'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        optimization: { ...formData.optimization, type: 'percentage' }
                      })}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: `2px solid ${formData.optimization?.type === 'percentage' ? '#27ae60' : '#e0e0e0'}`,
                        background: formData.optimization?.type === 'percentage' ? 'rgba(39, 174, 96, 0.1)' : 'white',
                        color: formData.optimization?.type === 'percentage' ? '#27ae60' : '#7f8c8d',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      📊 {t('budget.optimization.percentage') || 'Pourcentage'}
                    </button>
                  </div>
                </div>
                
                {/* Valeur */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '0.85em', color: 'rgba(255,255,255,0.7)', marginBottom: '8px', fontWeight: '600' }}>
                    {formData.optimization?.type === 'percentage' 
                      ? (t('budget.optimization.percentageValue') || "Pourcentage d'augmentation")
                      : (t('budget.optimization.amountValue') || 'Montant supplémentaire')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2em', color: '#27ae60' }}>+</span>
                    <input
                      type="number"
                      value={formData.optimization?.value || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        optimization: { ...formData.optimization, value: e.target.value }
                      })}
                      placeholder="0"
                      style={{
                        flex: 1,
                        padding: '12px 14px',
                        fontSize: '1em',
                        border: '2px solid #27ae60',
                        borderRadius: '10px',
                        outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '1.2em', color: '#27ae60', fontWeight: 'bold' }}>
                      {formData.optimization?.type === 'percentage' ? '%' : '$'}
                    </span>
                  </div>
                </div>
                
                {/* Période */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85em', color: 'rgba(255,255,255,0.7)', marginBottom: '8px', fontWeight: '600' }}>
                    {t('budget.optimization.period') || "Période d'application"}
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        optimization: { ...formData.optimization, period: 'ascending' }
                      })}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: `2px solid ${formData.optimization?.period === 'ascending' ? '#3498db' : '#e0e0e0'}`,
                        background: formData.optimization?.period === 'ascending' ? 'rgba(52, 152, 219, 0.1)' : 'white',
                        color: formData.optimization?.period === 'ascending' ? '#3498db' : '#7f8c8d',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      📈 {t('budget.optimization.ascending') || 'Croissante'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        optimization: { ...formData.optimization, period: 'descending' }
                      })}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: `2px solid ${formData.optimization?.period === 'descending' ? '#3498db' : '#e0e0e0'}`,
                        background: formData.optimization?.period === 'descending' ? 'rgba(52, 152, 219, 0.1)' : 'white',
                        color: formData.optimization?.period === 'descending' ? '#3498db' : '#7f8c8d',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      📉 {t('budget.optimization.descending') || 'Décroissante'}
                    </button>
                  </div>
                </div>
                
                {/* Résumé */}
                {formData.optimization?.value && (
                  <div style={{ background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.1) 0%, rgba(46, 204, 113, 0.1) 100%)', borderRadius: '12px', padding: '15px', marginBottom: '20px', border: '2px solid #27ae60' }}>
                    <p style={{ margin: 0, fontSize: '0.85em', color: '#27ae60', fontWeight: '600' }}>
                      ♻️ {t('budget.optimization.summary') || 'Résumé'}: +{formData.optimization.type === 'percentage' ? `${formData.optimization.value}%` : `${formData.optimization.value}$`} 
                      {' '}({formData.optimization.period === 'ascending' ? '📈' : '📉'})
                    </p>
                    {formData.optimization.type === 'percentage' && formData.montant && (
                      <p style={{ margin: '5px 0 0', fontSize: '0.8em', color: '#7f8c8d' }}>
                        = {(parseFloat(formData.montant) * (1 + parseFloat(formData.optimization.value) / 100)).toFixed(2)}$ {t('budget.optimization.perOccurrence') || 'par occurrence'}
                      </p>
                    )}
                    {formData.optimization.type === 'amount' && formData.montant && (
                      <p style={{ margin: '5px 0 0', fontSize: '0.8em', color: '#7f8c8d' }}>
                        = {(parseFloat(formData.montant) + parseFloat(formData.optimization.value)).toFixed(2)}$ {t('budget.optimization.perOccurrence') || 'par occurrence'}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => setShowOptimizationPopup(false)} 
                style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '10px', color: 'white', fontWeight: '600', cursor: 'pointer' }}
              >
                {t('common.cancel')}
              </button>
              <button 
                type="button" 
                onClick={() => setShowOptimizationPopup(false)} 
                style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '600', cursor: 'pointer' }}
              >
                {t('common.confirm') || 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ========== POPUP CÉLÉBRATION PREMIER AJOUT ========== */}
      {celebrationMessage && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px 40px',
          borderRadius: '20px',
          boxShadow: '0 10px 40px rgba(102, 126, 234, 0.5)',
          zIndex: 2000,
          animation: 'celebration-pop 0.4s ease-out',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '2em', display: 'block', marginBottom: '10px' }}>🎊</span>
          <p style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold' }}>{celebrationMessage}</p>
          {/* Confettis */}
          <div style={{ position: 'absolute', top: '-20px', left: '20%', fontSize: '1.5em', animation: 'confetti 1s ease-out forwards' }}>🎉</div>
          <div style={{ position: 'absolute', top: '-20px', left: '50%', fontSize: '1.5em', animation: 'confetti 1.2s ease-out forwards' }}>✨</div>
          <div style={{ position: 'absolute', top: '-20px', left: '80%', fontSize: '1.5em', animation: 'confetti 0.8s ease-out forwards' }}>🎉</div>
        </div>
      )}
      
      {/* ========== MODAL UPGRADE (restrictions abonnement) ========== */}
      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ isOpen: false, type: null })}
        limitType={upgradeModal.type}
      />
      
      {/* ========== 🆕 NUMPAD MODAL (saisie montant tactile) ========== */}
      <NumpadModal
        isOpen={showNumpadModal}
        onClose={() => setShowNumpadModal(false)}
        onConfirm={(value) => {
          setFormData({...formData, montant: value.toString()});
        }}
        initialValue={parseFloat(formData.montant) || 0}
        title={t('budget.enterAmount', 'Entrer le montant')}
        currency="$"
        allowDecimals={true}
      />
      
      {/* ========== 🆕 DAY PICKER MODAL (sélection jour tactile) ========== */}
      <DayPickerModal
        isOpen={showDayPickerModal}
        onClose={() => setShowDayPickerModal(false)}
        onConfirm={(value) => {
          if (dayPickerMode === 'weekDay') {
            setFormData({...formData, jourSemaine: value.toString()});
          } else if (dayPickerMode === 'lastDates') {
            setFormData({...formData, dateReference: value});
          } else {
            setFormData({...formData, jourRecurrence: value.toString()});
          }
        }}
        initialValue={
          dayPickerMode === 'weekDay' 
            ? (parseInt(formData.jourSemaine) || 1)
            : dayPickerMode === 'lastDates'
              ? (formData.dateReference || null)
              : (parseInt(formData.jourRecurrence) || 1)
        }
        mode={dayPickerMode}
        title={
          dayPickerMode === 'weekDay'
            ? t('budget.selectWeekDay', 'Jour de la semaine')
            : dayPickerMode === 'lastDates'
              ? t('budget.selectLastDate', 'Dernière date')
              : t('budget.selectMonthDay', 'Jour du mois')
        }
      />
      
      {/* ========== 🆕 ACCOUNT PICKER MODAL (sélection compte tactile) ========== */}
      <AccountPickerModal
        isOpen={showAccountPickerModal}
        onClose={() => setShowAccountPickerModal(false)}
        onSelect={(accountName) => {
          setFormData({...formData, compte: accountName});
        }}
        accounts={accounts}
        selectedAccount={formData.compte}
        title={t('budget.selectAccount', 'Sélectionner un compte')}
      />
      
      {/* ========== 🆕 DATE PICKER MODAL (sélection date complète) ========== */}
      <DatePickerModal
        isOpen={showDatePickerModal}
        onClose={() => setShowDatePickerModal(false)}
        onConfirm={(value) => {
          if (datePickerTarget === 'dateDepart') {
            setFormData({...formData, dateDepart: value});
          } else if (datePickerTarget === 'dateFinRecurrence') {
            setFormData({...formData, dateFinRecurrence: value});
          } else if (datePickerTarget === 'date') {
            setFormData({...formData, date: value});
          }
        }}
        initialValue={
          datePickerTarget === 'dateDepart' ? formData.dateDepart :
          datePickerTarget === 'dateFinRecurrence' ? formData.dateFinRecurrence :
          datePickerTarget === 'date' ? formData.date : null
        }
        title={
          datePickerTarget === 'dateDepart' ? t('budget.startDate', 'Date de départ') :
          datePickerTarget === 'dateFinRecurrence' ? t('budget.endDate', 'Date de fin') :
          t('budget.transactionDate', 'Date de la transaction')
        }
      />
    </div> {/* Fin conteneur blanc */}
    </div> {/* Fin wrapper bleu */}
    </>
  );
};

export default Budget;
