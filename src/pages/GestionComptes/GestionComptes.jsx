// 📊 GESTION DE COMPTES - Optimisation de parcours financier
// Intégration de la Trajectoire Avancée + Workflow amélioration
// ✅ Utilise useGuideProgress pour la logique centralisée

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserData } from '../../context/UserDataContext';
import useGuideProgress from '../../hooks/useGuideProgress';
import PageGuideModal from '../../components/common/PageGuideModal';
import useTooltipTour from '../../hooks/useTooltipTour';
import TooltipTour from '../../components/common/TooltipTour';
import { useTheme } from '../../context/ThemeContext';
import optimizationService from '../../services/optimization.service';  // ✅ Ajout du service

const GestionComptes = () => {
  const { userData, isLoading, saveUserData } = useUserData();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // ✅ Hook centralisé pour la progression du guide
  const { shouldShowGuide, markGuideCompleted, isLoading: isGuideLoading } = useGuideProgress();
  
  // 🎨 Theme support
  const { isDark } = useTheme();
  
  // 📱 Détection mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // 📱 Détecter si on est en mode PWA (standalone)
  const [isPWA, setIsPWA] = useState(false);
  
  useEffect(() => {
    setIsPWA(window.matchMedia('(display-mode: standalone)').matches);
  }, []);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // État pour le guide utilisateur
  const [showGuide, setShowGuide] = useState(false);
  const [showContinueBar, setShowContinueBar] = useState(false);
  
  // 🎯 Hook pour les tooltips interactifs
  const {
    isActive: isTooltipActive,
    currentTooltip,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    skipAll,
    startTour: startTooltipTour,
    resetTooltips
  } = useTooltipTour('gestionComptes', {
    onComplete: () => setShowContinueBar(true)
  });
  
  // Vérifier si le guide doit être affiché
  useEffect(() => {
    if (!isGuideLoading && shouldShowGuide('gestion')) {
      setShowGuide(true);
    }
  }, [shouldShowGuide, isGuideLoading]);
  
  // Fermer le modal et afficher la barre "On continue"
  const closeModal = () => {
    setShowGuide(false);
    startTooltipTour(); // Démarre le tour de tooltips
  };
  
  // Marquer comme complété et passer à la page suivante
  const continueToNextPage = () => {
    setShowContinueBar(false);
    markGuideCompleted('gestion');
    setTimeout(() => {
      navigate('/parametres');
    }, 100);
  };
  
  // États
  const [requestStatus, setRequestStatus] = useState('none'); // 'none', 'pending', 'ready'
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showTrajectoireModal, setShowTrajectoireModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);  // ✅ Modal proposition OPE
  const [proposedReport, setProposedReport] = useState(null);
  const [proposalData, setProposalData] = useState(null);  // ✅ Données complètes de la proposition
  const [isAcceptingProposal, setIsAcceptingProposal] = useState(false);  // ✅ Loading state
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedTrajectoirePoint, setSelectedTrajectoirePoint] = useState({ type: 'today', index: 0 });
  const [userRequestId, setUserRequestId] = useState(null);
  
  // 📱 Lire le paramètre fullscreen de l'URL (pour navigation depuis Sidebar mobile)
  useEffect(() => {
    const fullscreenParam = searchParams.get('fullscreen');
    if (fullscreenParam === 'true' && isMobile) {
      setIsFullScreen(true);
      // Nettoyer l'URL après avoir lu le paramètre
      navigate('/gestion-comptes', { replace: true });
    }
  }, [searchParams, isMobile, navigate]);
  
  // Synchroniser requestStatus avec le backend ET userData.optimizationRequest
  useEffect(() => {
    const loadActiveRequest = async () => {
      try {
        // Vérifier si une demande active existe dans le backend
        const activeData = await optimizationService.getActiveRequest();
        
        if (activeData.hasActiveRequest && activeData.request) {
          console.log('[GestionComptes] Demande active trouvée:', activeData.request);
          setRequestStatus(activeData.request.status === 'proposal_ready' ? 'ready' : 'pending');
          setUserRequestId(activeData.request.requestId);
          
          // Si proposition prête, charger les détails COMPLETS
          if (activeData.request.status === 'proposal_ready') {
            const request = activeData.request;
            
            // Stocker les données complètes de la proposition
            setProposalData({
              requestId: request.requestId,
              proposalMessage: request.proposalMessage,
              proposedChanges: request.proposedChanges,  // ✅ Contient recommendations avec budgetId, interventionDate, newAmount, frequence
              projectedImpact: request.projectedImpact,  // ✅ Contient monthlyRecovery, reductionPercent, etc.
              proposalCreatedAt: request.proposalCreatedAt
            });
            
            setProposedReport({
              date: new Date(request.proposalCreatedAt).toLocaleDateString(),
              requestId: request.requestId,
              message: request.proposalMessage,
              accounts: []
            });
          }
        } else if (userData?.optimizationRequest?.requested) {
          // Fallback: utiliser les données locales
          setRequestStatus('pending');
          setUserRequestId(userData.optimizationRequest.requestId || 'REQ-LOCAL');
        } else {
          setRequestStatus('none');
          setUserRequestId(null);
          setProposalData(null);
        }
      } catch (error) {
        console.error('[GestionComptes] Erreur chargement demande active:', error);
        // Fallback sur données locales en cas d'erreur
        if (userData?.optimizationRequest?.requested) {
          setRequestStatus('pending');
          setUserRequestId(userData.optimizationRequest.requestId || 'REQ-LOCAL');
        }
      }
    };
    
    if (!isLoading) {
      loadActiveRequest();
    }
  }, [isLoading, userData?.optimizationRequest?.requested]);
  
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
    setBalancesHidden(!balancesHidden);
  };

  // Générer un ID unique pour la demande (confidentialité)
  const generateRequestId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `REQ-${timestamp}-${random}`.toUpperCase();
  };

  // Données
  const accounts = userData?.accounts || [];
  const initialBalances = userData?.initialBalances?.soldes || [];
  const baseBudgetEntrees = userData?.budgetPlanning?.entrees || [];
  const baseBudgetSorties = userData?.budgetPlanning?.sorties || [];
  const financialGoals = userData?.financialGoals || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const moisShort = useMemo(() => [
    t('monthsShort.jan'), t('monthsShort.feb'), t('monthsShort.mar'),
    t('monthsShort.apr'), t('monthsShort.may'), t('monthsShort.jun'),
    t('monthsShort.jul'), t('monthsShort.aug'), t('monthsShort.sep'),
    t('monthsShort.oct'), t('monthsShort.nov'), t('monthsShort.dec')
  ], [t]);

  const moisLong = useMemo(() => [
    t('months.january').toLowerCase(), t('months.february').toLowerCase(), t('months.march').toLowerCase(),
    t('months.april').toLowerCase(), t('months.may').toLowerCase(), t('months.june').toLowerCase(),
    t('months.july').toLowerCase(), t('months.august').toLowerCase(), t('months.september').toLowerCase(),
    t('months.october').toLowerCase(), t('months.november').toLowerCase(), t('months.december').toLowerCase()
  ], [t]);

  const formatDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Formater montant selon la langue
  const formatMontant = (montant) => {
    if (balancesHidden) return '••••••';
    const num = new Intl.NumberFormat(i18n.language === 'en' ? 'en-CA' : 'fr-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant);
    return i18n.language === 'en' ? '$' + num : num + ' $';
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
      'cheque': '#3498db',
      'epargne': '#3498db',
      'credit': '#ffa500',
      'investissement': '#9b59b6'
    };
    return colors[type] || '#95a5a6';
  };

  // Transactions pour une date
  const getTransactionsForDate = useCallback((date, items, isEntree) => {
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
        case 'bimensuel':
          const firstDay = Math.min(jour, lastDayOfMonth);
          const secondDay = Math.min(jour + 15, lastDayOfMonth);
          isMatch = dateDay === firstDay || dateDay === secondDay;
          break;
        case 'hebdomadaire':
          isMatch = dateDay % 7 === jour % 7;
          break;
        case 'annuel':
          isMatch = checkDayMatch(jour) && date.getMonth() === 0;
          break;
        default:
          isMatch = checkDayMatch(jour);
      }

      if (isMatch && item.compte) {
        transactions.push({
          compte: item.compte,
          description: item.description,
          montant: parseFloat(item.montant) || 0,
          isEntree,
          // ✅ NOUVEAU - Pour analyse What-If par l'Admin
          flexibility: item.flexibility || 'variable',
          frequence: item.frequence,
          budgetId: item.id || item.description
        });
      }
    });
    
    return transactions;
  }, []);

  // Calcul des données de trajectoire (similaire à GPS Financier)
  const allDayData = useMemo(() => {
    const data = [];
    
    const runningBalances = {};
    accounts.forEach(acc => {
      const solde = initialBalances.find(s => s.accountName === acc.nom);
      runningBalances[acc.nom] = parseFloat(solde?.solde) || 0;
    });

    const start = new Date(today);
    const daysToLoad = 19710; // 54 ans
    
    for (let i = 0; i < daysToLoad; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const currentDateStr = formatDateStr(currentDate);
      
      const entreesJour = getTransactionsForDate(currentDate, baseBudgetEntrees, true);
      const sortiesJour = getTransactionsForDate(currentDate, baseBudgetSorties, false);
      
      const accountsData = {};
      accounts.forEach(acc => {
        const isCredit = acc.type === 'credit';
        
        const entreesCompte = entreesJour.filter(t => t.compte === acc.nom);
        const sortiesCompte = sortiesJour.filter(t => t.compte === acc.nom);
        
        const totalEntrees = entreesCompte.reduce((sum, t) => sum + t.montant, 0);
        const totalSorties = sortiesCompte.reduce((sum, t) => sum + t.montant, 0);
        
        const soldePrecedent = runningBalances[acc.nom];
        
        if (isCredit) {
          runningBalances[acc.nom] = runningBalances[acc.nom] - totalEntrees + totalSorties;
        } else {
          runningBalances[acc.nom] = runningBalances[acc.nom] + totalEntrees - totalSorties;
        }
        
        const hasActivity = totalEntrees > 0 || totalSorties > 0;
        
        accountsData[acc.nom] = {
          solde: runningBalances[acc.nom],
          soldePrecedent: soldePrecedent,
          totalEntrees,
          totalSorties,
          isCredit,
          type: acc.type,
          hasActivity
        };
      });

      const isToday = currentDateStr === todayStr;
      const hasActivity = Object.values(accountsData).some(acc => acc.hasActivity);

      data.push({
        date: currentDate,
        dateStr: currentDateStr,
        monthKey: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
        label: `${currentDate.getDate()} ${moisLong[currentDate.getMonth()]} ${currentDate.getFullYear()}`,
        isToday,
        hasActivity,
        accounts: accountsData,
        // ✅ NOUVEAU - Pour analyse What-If par l'Admin
        transactions: hasActivity ? {
          entrees: entreesJour,  // avec flexibility, frequence, budgetId
          sorties: sortiesJour   // avec flexibility, frequence, budgetId
        } : null
      });
    }

    return data;
  }, [accounts, initialBalances, baseBudgetEntrees, baseBudgetSorties, todayStr, getTransactionsForDate]);

  // Calculer les objectifs avec progression et date d'atteinte
  const goalsWithProgress = useMemo(() => {
    return financialGoals.map(goal => {
      const soldeInfo = initialBalances.find(s => s.accountName === goal.compteAssocie);
      const soldeActuel = parseFloat(soldeInfo?.solde) || 0;
      const montantCible = parseFloat(goal.montantCible) || 0;
      
      const compte = accounts.find(a => a.nom === goal.compteAssocie);
      const isCredit = compte?.type === 'credit';
      
      let progression = 0;
      let isAchieved = false;
      
      if (isCredit) {
        if (soldeActuel <= montantCible) {
          progression = 100;
          isAchieved = true;
        } else {
          const compteData = accounts.find(a => a.nom === goal.compteAssocie);
          const limite = parseFloat(compteData?.limite) || 6000;
          const depuisLimite = limite - montantCible;
          progression = depuisLimite > 0 ? Math.max(0, ((limite - soldeActuel) / depuisLimite) * 100) : 0;
        }
      } else {
        if (soldeActuel >= montantCible) {
          progression = 100;
          isAchieved = true;
        } else {
          progression = montantCible > 0 ? (soldeActuel / montantCible) * 100 : 0;
        }
      }

      // Trouver la date d'atteinte dans allDayData
      let etaLabel = '';
      let etaDateStr = null;
      let moisRestants = 0;

      const isGoalReached = (solde) => {
        if (isCredit) return solde <= montantCible;
        return solde >= montantCible;
      };

      const dayMatch = allDayData.find(day => {
        const accountData = day.accounts[goal.compteAssocie];
        return accountData && isGoalReached(accountData.solde);
      });

      if (dayMatch) {
        etaDateStr = dayMatch.dateStr;
        const etaDate = dayMatch.date;
        etaLabel = `${etaDate.getDate()} ${moisShort[etaDate.getMonth()]} ${etaDate.getFullYear()}`;
        moisRestants = Math.ceil((etaDate - today) / (1000 * 60 * 60 * 24 * 30));
      } else if (isAchieved) {
        etaLabel = t('gps.goalStatus.reached');
      } else {
        etaLabel = t('goals.noData');
      }

      return {
        ...goal,
        soldeActuel,
        progression: Math.min(100, Math.round(progression)),
        isAchieved,
        isCredit,
        etaLabel,
        etaDateStr,
        moisRestants
      };
    });
  }, [financialGoals, initialBalances, accounts, allDayData]);

  // Points de trajectoire (objectifs triés par date)
  const trajectoirePoints = useMemo(() => {
    const points = [
      { type: 'today', label: t('common.today'), dateStr: todayStr, date: today, progression: 0 }
    ];

    goalsWithProgress
      .filter(g => g.etaDateStr && !g.isAchieved)
      .sort((a, b) => a.etaDateStr.localeCompare(b.etaDateStr))
      .forEach(goal => {
        const date = new Date(goal.etaDateStr);
        points.push({
          type: 'goal',
          label: goal.nom,
          dateStr: goal.etaDateStr,
          date: date,
          progression: goal.progression,
          moisRestants: goal.moisRestants,
          compte: goal.compteAssocie,
          montantCible: goal.montantCible,
          isCredit: goal.isCredit
        });
      });

    // Calculer la progression globale
    const totalPoints = points.length;
    points.forEach((p, idx) => {
      p.globalProgress = Math.round((idx / Math.max(1, totalPoints - 1)) * 100);
    });

    return points;
  }, [goalsWithProgress, todayStr]);

  // Obtenir les soldes à une date spécifique
  const getSoldesAtDate = (dateStr) => {
    const dayData = allDayData.find(d => d.dateStr === dateStr);
    if (dayData) {
      return dayData.accounts;
    }
    // Retourner les soldes actuels si date non trouvée
    const result = {};
    accounts.forEach(acc => {
      const solde = initialBalances.find(s => s.accountName === acc.nom);
      result[acc.nom] = {
        solde: parseFloat(solde?.solde) || 0,
        isCredit: acc.type === 'credit',
        type: acc.type
      };
    });
    return result;
  };

  // Demander une amélioration - ✅ UTILISE LE SERVICE BACKEND
  const requestImprovement = async () => {
    try {
      setShowRequestModal(false);
      
      // 1. Créer la demande dans le backend (table OptimizationRequest)
      // ✅ Envoi de allDayData pour analyse What-If par l'Admin
      const response = await optimizationService.createRequest(allDayData);
      console.log('[GestionComptes] Demande créée dans le backend:', response);
      
      // 2. Mettre à jour l'état local
      setUserRequestId(response.requestId);
      setRequestStatus('pending');
      
      // 3. Sauvegarder dans userData pour synchronisation avec les autres pages
      await saveUserData({
        ...userData,
        optimizationRequest: {
          requested: true,
          requestedAt: response.createdAt || new Date().toISOString(),
          requestId: response.requestId,
          status: 'pending'
        }
      });
      
      console.log('[GestionComptes] Demande envoyée avec succès! ID:', response.requestId);
      
    } catch (error) {
      console.error('[GestionComptes] Erreur création demande:', error);
      alert(error.error || 'Erreur lors de l\'envoi de la demande. Veuillez réessayer.');
    }
  };

  // Simuler une réponse admin (pour démo)
  const simulateAdminResponse = () => {
    setProposedReport({
      date: new Date().toLocaleDateString(i18n.language === 'en' ? 'en-CA' : 'fr-CA'),
      requestId: userRequestId,
      accounts: accounts.map(acc => {
        const soldeActuel = parseFloat(initialBalances.find(s => s.accountName === acc.nom)?.solde) || 0;
        return {
          nom: acc.nom,
          type: acc.type,
          soldeActuel: soldeActuel,
          soldePropose: acc.type === 'credit' 
            ? Math.max(0, soldeActuel - 1500)
            : soldeActuel + 800,
          changement: acc.type === 'credit' ? -1500 : 800
        };
      }),
      message: "J'ai optimisé votre budget pour accélérer le remboursement de vos cartes de crédit tout en augmentant votre épargne. Vos objectifs seront atteints plus rapidement."
    });
    setRequestStatus('ready');
  };

  // Accepter l'amélioration - ✅ APPELLE LE BACKEND ET CRÉE LES MODIFICATIONS
  const acceptImprovement = async () => {
    if (!proposalData || !userRequestId) return;
    
    setIsAcceptingProposal(true);
    
    try {
      console.log('[GestionComptes] Acceptation de la proposition:', userRequestId);
      console.log('[GestionComptes] Données à appliquer:', proposalData.proposedChanges);
      
      // 1. Appeler l'API pour accepter
      await optimizationService.respondToProposal(userRequestId, 'accepted');
      
      // 2. Créer les budgetModifications localement
      const recommendations = proposalData.proposedChanges?.recommendations || [];
      const newModifications = recommendations
        .filter(rec => rec.budgetId) // S'assurer que le budgetId existe
        .map(rec => ({
          id: `mod_ope_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          budgetId: rec.budgetId,
          description: `OPE - ${rec.budgetDescription || rec.accountName}`,
          dateDebut: rec.interventionDate,
          dateFin: '', // Chaîne vide au lieu de null pour éviter les erreurs
          nouveauMontant: rec.newAmount,
          frequence: rec.frequence || 'mensuel',
          appliedAt: new Date().toISOString(),
          source: 'OPE-1',
          active: true
        }));
      
      console.log('[GestionComptes] Nouvelles modifications à créer:', newModifications);
      
      // 3. Fusionner avec les modifications existantes (filtrer les null/undefined)
      const existingModifications = (userData?.budgetPlanning?.modifications || []).filter(m => m);
      const updatedModifications = [...existingModifications, ...newModifications];
      
      // 4. Sauvegarder dans userData
      await saveUserData({
        ...userData,
        budgetPlanning: {
          ...userData.budgetPlanning,
          modifications: updatedModifications
        },
        optimizationRequest: null  // Réinitialiser
      });
      
      // 5. Réinitialiser l'état local
      setShowProposalModal(false);
      setShowConfirmModal(false);
      setRequestStatus('none');
      setProposedReport(null);
      setProposalData(null);
      setUserRequestId(null);
      
      alert('✅ Optimisation acceptée! Vos paiements ont été ajustés.');
      
    } catch (error) {
      console.error('[GestionComptes] Erreur acceptation:', error);
      alert('❌ Erreur lors de l\'acceptation. Veuillez réessayer.');
    } finally {
      setIsAcceptingProposal(false);
    }
  };

  // Refuser la proposition
  const rejectProposal = async () => {
    if (!userRequestId) return;
    
    try {
      console.log('[GestionComptes] Refus de la proposition:', userRequestId);
      
      // Appeler l'API pour refuser
      await optimizationService.respondToProposal(userRequestId, 'rejected');
      
      // Réinitialiser l'état local
      await saveUserData({
        ...userData,
        optimizationRequest: null
      });
      
      setShowProposalModal(false);
      setRequestStatus('none');
      setProposedReport(null);
      setProposalData(null);
      setUserRequestId(null);
      
      // Message simple
      alert('✅ Proposition supprimée.');
      
    } catch (error) {
      console.error('[GestionComptes] Erreur refus:', error);
      alert('❌ Erreur lors de la suppression. Veuillez réessayer.');
    }
  };

  // Gérer Escape pour fermer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showTrajectoireModal) setShowTrajectoireModal(false);
        else if (isFullScreen) setIsFullScreen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, showTrajectoireModal]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: '1.2em', color: '#7f8c8d' }}>{t('common.loading')}</p>
      </div>
    );
  }

  // Point de trajectoire sélectionné
  const currentPoint = trajectoirePoints[selectedTrajectoirePoint.index] || trajectoirePoints[0];
  const currentSoldes = getSoldesAtDate(currentPoint.dateStr);
  const todaySoldes = getSoldesAtDate(todayStr);

  // Rendu du contenu principal
  const renderContent = () => (
    <div style={{
      display: isMobile ? 'flex' : 'grid',
      flexDirection: isMobile ? 'column' : undefined,
      gridTemplateColumns: isMobile ? undefined : '1fr auto 1fr',
      gap: '20px',
      alignItems: 'start'
    }}>
      {/* COLONNE GAUCHE - Trajectoire Actuelle (Bulle cliquable) */}
      <div
        data-tooltip="gestion-trajectory"
        onClick={(e) => { e.stopPropagation(); setShowTrajectoireModal(true); }}
        style={{
          background: isDark ? 'linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' : 'linear-gradient(180deg, #1e293b 0%, #334155 50%, #475569 100%)',
          borderRadius: '20px',
          padding: '25px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          transition: 'all 0.3s',
          border: '2px solid transparent'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.border = '2px solid #667eea';
          e.currentTarget.style.transform = 'scale(1.01)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.border = '2px solid transparent';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5em' }}>🛤️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1em', color: 'white' }}>
                {t('management.trajectory.title')}
              </h2>
              <p style={{ margin: 0, fontSize: '0.8em', color: 'rgba(255,255,255,0.7)' }}>
                {t('management.trajectory.clickToSee')}
              </p>
            </div>
          </div>
          <span style={{ 
            background: '#667eea', 
            color: 'white', 
            padding: '5px 10px', 
            borderRadius: '15px',
            fontSize: '0.75em',
            fontWeight: 'bold'
          }}>
            {trajectoirePoints.length - 1} {t('management.trajectory.goals')}
          </span>
        </div>

        {/* Mini timeline */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px',
          padding: '15px',
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderRadius: '12px'
        }}>
          {trajectoirePoints.slice(0, 5).map((point, idx) => (
            <div key={idx} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              flex: 1
            }}>
              <div style={{
                width: '35px',
                height: '35px',
                borderRadius: '50%',
                background: point.type === 'today' 
                  ? 'linear-gradient(135deg, #f39c12, #ffa500)'
                  : `linear-gradient(135deg, ${getCompteColor(accounts.find(a => a.nom === point.compte)?.type || 'cheque')}, ${getCompteColor(accounts.find(a => a.nom === point.compte)?.type || 'cheque')}88)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.9em',
                fontWeight: 'bold',
                boxShadow: '0 3px 10px rgba(0,0,0,0.3)'
              }}>
                {point.type === 'today' ? '📍' : `${point.progression}%`}
              </div>
              <span style={{ 
                fontSize: '0.6em', 
                color: isDark ? '#a0a0a0' : '#64748b', 
                marginTop: '5px',
                textAlign: 'center',
                maxWidth: '60px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {point.type === 'today' ? t('common.today') : point.label.substring(0, 15)}
              </span>
            </div>
          ))}
          {trajectoirePoints.length > 5 && (
            <div style={{ color: '#667eea', fontSize: '0.8em' }}>+{trajectoirePoints.length - 5}</div>
          )}
        </div>

        {/* Résumé des soldes actuels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {accounts.slice(0, 4).map((acc, idx) => {
            const solde = parseFloat(initialBalances.find(s => s.accountName === acc.nom)?.solde) || 0;
            const isCredit = acc.type === 'credit';
            return (
              <div key={idx} style={{
                padding: '12px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '1.2em' }}>{getCompteIcon(acc.type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '0.7em', 
                    color: '#a0a0a0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {acc.nom}
                  </p>
                  <p style={{ 
                    margin: 0, 
                    fontWeight: 'bold', 
                    color: isCredit ? '#ffa500' : '#3498db',
                    fontSize: '0.9em'
                  }}>
                    {formatMontant(solde)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: '15px',
          textAlign: 'center',
          color: '#667eea',
          fontSize: '0.85em',
          fontWeight: '600'
        }}>
          👆 {t('management.trajectory.clickToExplore')}
        </div>
      </div>

      {/* COLONNE CENTRALE - Actions */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '20px',
        padding: isMobile ? '20px 10px' : '20px 15px',
        minWidth: isMobile ? 'auto' : '220px',
        order: isMobile ? 1 : 0
      }}>
        {/* Bouton Améliorer - bloqué pendant l'onboarding */}
        {requestStatus === 'none' && (
          <button
            data-tooltip="gestion-improve"
            onClick={(e) => { 
              e.stopPropagation(); 
              if (!showContinueBar) {
                setShowRequestModal(true); 
              }
            }}
            title={showContinueBar ? t('nav.locked') : ''}
            style={{
              padding: '25px 30px',
              borderRadius: '20px',
              border: 'none',
              background: showContinueBar 
                ? 'linear-gradient(135deg, #666 0%, #444 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1em',
              cursor: showContinueBar ? 'not-allowed' : 'pointer',
              opacity: showContinueBar ? 0.6 : 1,
              boxShadow: showContinueBar 
                ? '0 5px 15px rgba(0,0,0,0.2)'
                : '0 10px 30px rgba(102, 126, 234, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.3s',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: '2.5em' }}>{showContinueBar ? '🔒' : '🚀'}</span>
            <span>{t('management.improve.title')}</span>
          </button>
        )}

        {/* Statut En attente - version simplifiée */}
        {requestStatus === 'pending' && (
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '25px 30px',
              borderRadius: '20px',
              background: 'rgba(243, 156, 18, 0.15)',
              border: '2px solid #f39c12',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: '2.5em', display: 'block', marginBottom: '12px' }}>⏳</span>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#f39c12', fontSize: '1.1em' }}>
              {t('management.improve.requestSent')}
            </p>
          </div>
        )}

        {/* Flèche de progression - cachée sur mobile */}
        {!isMobile && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: requestStatus === 'ready' ? '#3498db' : isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8'
        }}>
          <div style={{
            width: '4px',
            height: '50px',
            background: requestStatus === 'ready' 
              ? 'linear-gradient(180deg, #3498db, #2980b9)'
              : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
            borderRadius: '2px'
          }} />
          <span style={{ fontSize: '2em' }}>
            {requestStatus === 'ready' ? '✅' : '➡️'}
          </span>
          <div style={{
            width: '4px',
            height: '50px',
            background: requestStatus === 'ready' 
              ? 'linear-gradient(180deg, #2980b9, #3498db)'
              : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
            borderRadius: '2px'
          }} />
        </div>
        )}

        {/* Bouton Accepter */}
        {requestStatus === 'ready' && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowConfirmModal(true); }}
            style={{
              padding: '25px 30px',
              borderRadius: '20px',
              border: 'none',
              background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1em',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(52, 152, 219, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'center',
              animation: 'pulse-button 2s ease-in-out infinite'
            }}
          >
            <span style={{ fontSize: '2.5em' }}>✅</span>
            <span>{t('management.accept.title')}</span>
          </button>
        )}
      </div>

      {/* COLONNE DROITE - Rapport À Jour - CLIQUABLE quand proposition prête */}
      <div 
        data-tooltip="gestion-report"
        onClick={(e) => {
          e.stopPropagation();
          if (requestStatus === 'ready' && proposalData) {
            setShowProposalModal(true);
          }
        }}
        style={{
          background: requestStatus === 'ready' 
            ? 'linear-gradient(135deg, rgba(39, 174, 96, 0.2) 0%, rgba(46, 204, 113, 0.15) 100%)'
            : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '25px',
          boxShadow: requestStatus === 'ready'
            ? '0 8px 30px rgba(39, 174, 96, 0.25)'
            : isDark ? '0 4px 20px rgba(0,0,0,0.15)' : '0 4px 20px rgba(0,0,0,0.08)',
          border: requestStatus === 'ready' ? '2px solid #27ae60' : isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(102, 126, 234, 0.2)',
          transition: 'all 0.3s',
          cursor: requestStatus === 'ready' ? 'pointer' : 'default',
          order: isMobile ? 2 : 0
        }}
        onMouseEnter={(e) => {
          if (requestStatus === 'ready') {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(39, 174, 96, 0.35)';
          }
        }}
        onMouseLeave={(e) => {
          if (requestStatus === 'ready') {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(39, 174, 96, 0.25)';
          }
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: '2px solid rgba(255,255,255,0.1)'
        }}>
          <span style={{ fontSize: '1.5em' }}>📈</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1em', color: 'white' }}>
              {t('management.report.title')}
            </h2>
            <p style={{ margin: 0, fontSize: '0.8em', color: 'rgba(255,255,255,0.7)' }}>
              {requestStatus === 'ready' 
                ? t('management.report.ready') 
                : t('management.report.waiting')}
            </p>
          </div>
          {requestStatus === 'ready' && (
            <span style={{
              marginLeft: 'auto',
              background: '#27ae60',
              color: 'white',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '0.75em',
              fontWeight: 'bold',
              animation: 'pulse-badge 1.5s ease-in-out infinite'
            }}>
              {t('management.report.new')}
            </span>
          )}
        </div>

        {requestStatus === 'ready' && proposalData ? (
          <>
            {/* Aperçu GPS-style de la proposition */}
            {(() => {
            const recommendations = proposalData.proposedChanges?.recommendations || [];
            const impact = proposalData.projectedImpact || {};
            // Utiliser les totaux mensuels envoyés par l'admin
            const totalCurrentPayments = proposalData.proposedChanges?.totalCurrentPaymentsMonthly || 
              recommendations.reduce((sum, rec) => sum + (rec.currentAmountMonthly || rec.currentAmount || 0), 0);
            const totalNewPayments = proposalData.proposedChanges?.totalNewPaymentsMonthly || 
            recommendations.reduce((sum, rec) => sum + (rec.newAmountMonthly || rec.newAmount || 0), 0);
            const monthlyRecovery = impact.monthlyRecovery || (totalCurrentPayments - totalNewPayments);
            const reductionPercent = totalCurrentPayments > 0 
              ? Math.round(((totalCurrentPayments - totalNewPayments) / totalCurrentPayments) * 100)
            : 0;
              
              return (
                <>
                  {/* Gros pourcentage */}
                  <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    background: 'rgba(39, 174, 96, 0.15)',
                    borderRadius: '15px',
                    marginBottom: '15px',
                    border: '2px solid rgba(39, 174, 96, 0.3)'
                  }}>
                    <div style={{ 
                      fontSize: '2.5em', 
                      fontWeight: 'bold', 
                      color: '#27ae60',
                      marginBottom: '5px'
                    }}>
                      -{reductionPercent}%
                    </div>
                    <div style={{ 
                      fontSize: '0.95em', 
                      color: 'rgba(255,255,255,0.8)'
                    }}>
                      📉 Réduction de vos paiements
                    </div>
                    <div style={{ 
                      fontSize: '1.1em', 
                      color: '#27ae60',
                      marginTop: '10px',
                      fontWeight: 'bold'
                    }}>
                      +{formatMontant(monthlyRecovery)}/mois
                    </div>
                  </div>

                  {/* Résumé des ajustements */}
                  <div style={{
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    marginBottom: '15px'
                  }}>
                    <div style={{ fontSize: '0.8em', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                      {recommendations.length} ajustement{recommendations.length > 1 ? 's' : ''} proposé{recommendations.length > 1 ? 's' : ''}
                    </div>
                    {recommendations.slice(0, 2).map((rec, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '5px 0',
                        fontSize: '0.85em',
                        color: 'rgba(255,255,255,0.7)'
                      }}>
                        <span>{rec.accountName}</span>
                        <span style={{ color: '#27ae60', fontWeight: 'bold' }}>
                          +{formatMontant(rec.monthlyRecovery)}
                        </span>
                      </div>
                    ))}
                    {recommendations.length > 2 && (
                      <div style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)', marginTop: '5px' }}>
                        +{recommendations.length - 2} autre{recommendations.length - 2 > 1 ? 's' : ''}...
                      </div>
                    )}
                  </div>

                  {/* Message d'invitation */}
                  <div style={{
                    textAlign: 'center',
                    padding: '15px',
                    background: 'rgba(39, 174, 96, 0.1)',
                    borderRadius: '12px',
                    border: '2px dashed rgba(39, 174, 96, 0.4)'
                  }}>
                    <span style={{ fontSize: '1.5em', marginRight: '10px' }}>👆</span>
                    <span style={{ color: '#27ae60', fontWeight: 'bold' }}>
                      Cliquez pour voir les détails
                    </span>
                  </div>
                </>
              );
            })()}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}>
            <span style={{ fontSize: '4em', display: 'block', marginBottom: '15px', opacity: 0.5 }}>📄</span>
            <p style={{ margin: 0, fontSize: '1em' }}>
              {requestStatus === 'pending' ? t('management.report.analyzing') : t('management.report.noProposal')}
            </p>
            <p style={{ margin: '10px 0 0', fontSize: '0.85em' }}>
              {requestStatus === 'pending'
                ? t('management.report.willReceive')
                : t('management.report.clickImprove')}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <style>
        {`
          @keyframes pulse-button {
            0%, 100% { transform: scale(1); box-shadow: 0 10px 30px rgba(39, 174, 96, 0.4); }
            50% { transform: scale(1.02); box-shadow: 0 15px 40px rgba(39, 174, 96, 0.5); }
          }
          @keyframes pulse-badge {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>

      {/* WRAPPER AVEC FOND pour le coin arrondi */}
      <div style={{
        height: '100%',
        background: isDark ? 'linear-gradient(180deg, #040449 0%, #100261 100%)' : '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* ZONE DE NOTIFICATIONS - Barre "On continue" / Demande PL4TO */}
        <div style={{
          background: showContinueBar 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : userData?.optimizationRequest?.requested
              ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)'
              : 'transparent',
          padding: (showContinueBar || userData?.optimizationRequest?.requested) ? '15px 25px' : '12px 25px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: showContinueBar ? 'flex-end' : 'space-between',
          color: (showContinueBar || userData?.optimizationRequest?.requested) ? 'white' : '#2c3e50',
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
          ) : userData?.optimizationRequest?.requested ? (
            // Bannière demande PL4TO en cours
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '1.8em', animation: 'pulse-badge 2s infinite' }}>⏳</span>
                <div>
                  <p style={{ margin: 0, fontSize: '1.1em' }}>
                    <span style={{ fontWeight: 'bold' }}>{t('management.pl4toRequest.title', 'Demande envoyée à PL4TO')}</span>
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85em', opacity: 0.9 }}>
                    {t('management.pl4toRequest.message', 'Notre équipe analyse votre trajectoire financière pour vous proposer des optimisations personnalisées.')}
                  </p>
                  {userData?.optimizationRequest?.requestedAt && (
                    <p style={{ margin: '4px 0 0', fontSize: '0.75em', opacity: 0.7 }}>
                      {t('management.pl4toRequest.sentOn', 'Envoyée le')} {new Date(userData.optimizationRequest.requestedAt).toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (window.confirm(t('management.pl4toRequest.cancelConfirm', 'Êtes-vous sûr de vouloir annuler votre demande?'))) {
                    await saveUserData({
                      ...userData,
                      optimizationRequest: null
                    });
                  }
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                {t('management.pl4toRequest.cancel', 'Annuler')}
              </button>
            </>
          ) : (
            // Zone vide (espace réservé pour futures notifications)
            <div style={{ width: '100%' }} />
          )}
        </div>

      {/* CONTENEUR BLANC pour le reste du contenu */}
      <div 
        style={{ 
          flex: 1,
          background: 'transparent',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          padding: '0'
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
        {/* Conteneur blanc */}
        <div style={{
          background: 'transparent',
          padding: '25px 30px 30px',
          minHeight: 'calc(100vh - 70px)',
          marginBottom: '10px'
        }}>
          <div style={{ marginBottom: '25px' }}>
            <h1 style={{
              fontSize: '1.8em',
              fontWeight: 'bold',
              color: isDark ? 'white' : '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              📊 {t('management.title')}
            </h1>
            <p style={{ fontSize: '1em', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>
              {t('management.subtitle')}
            </p>
          </div>

          {renderContent()}
        </div>
      </div> {/* Fin conteneur blanc */}
      </div> {/* Fin wrapper bleu */}

      {/* Mode Plein Écran */}
      {isFullScreen && (
        <div style={{
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
        }}>
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
            background: 'transparent',
            padding: isMobile ? '10px 15px' : '15px 30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}>
            {/* Titre - à gauche */}
            <h1 style={{ 
              margin: 0, 
              fontSize: isMobile ? '1.1em' : '1.5em', 
              fontWeight: 'bold', 
              color: isDark ? 'white' : '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              📊 {t('management.title')}
            </h1>
            
            {/* Boutons à droite */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              gap: isMobile ? '8px' : '10px' 
            }}>
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
                  color: isDark ? 'white' : '#64748b',
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
              
              {/* Bouton Œil pour masquer/afficher les soldes */}
              <button
                onClick={toggleBalances}
                title={balancesHidden ? t('gps.actions.showBalances') : t('gps.actions.hideBalances')}
                style={{
                  background: balancesHidden ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  border: balancesHidden ? 'none' : isDark ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(0,0,0,0.2)',
                  borderRadius: '50%',
                  width: isMobile ? '32px' : '40px',
                  height: isMobile ? '32px' : '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: isMobile ? '1em' : '1.2em',
                  transition: 'all 0.3s',
                  boxShadow: balancesHidden ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none'
                }}
              >
                {balancesHidden ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>
          
          {/* Sous-titre sur mobile */}
          {isMobile && (
            <p style={{ 
              margin: '0 15px 10px', 
              fontSize: '0.85em', 
              color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b',
              textAlign: 'center'
            }}>
              {t('management.subtitle')}
            </p>
          )}
          <div style={{ flex: 1, overflow: 'auto', padding: '30px', background: 'transparent' }}>
            {renderContent()}
          </div>
        </div>
      )}

      {/* Modal Trajectoire Avancée */}
      {showTrajectoireModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.5)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.3s ease-out'
        }}
        onClick={() => setShowTrajectoireModal(false)}
        >
          <div style={{
            background: isDark ? 'linear-gradient(135deg, #040449 0%, #100261 100%)' : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '25px',
            padding: '30px',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '85vh',
            overflow: 'auto',
            boxShadow: isDark ? '0 25px 80px rgba(0, 0, 0, 0.5)' : '0 25px 80px rgba(0, 0, 0, 0.15)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              marginBottom: isMobile ? '15px' : '25px',
              gap: isMobile ? '10px' : '0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: isMobile ? '1.4em' : '1.8em' }}>🛤️</span>
                <h2 style={{ margin: 0, color: 'white', fontSize: isMobile ? '1.1em' : '1.4em' }}>
                  {t('management.trajectory.title')}
                </h2>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: isMobile ? '10px' : '15px',
                width: isMobile ? '100%' : 'auto',
                justifyContent: isMobile ? 'space-between' : 'flex-end'
              }}>
                <span style={{
                  background: 'rgba(102, 126, 234, 0.3)',
                  color: '#a0c4ff',
                  padding: isMobile ? '6px 10px' : '8px 15px',
                  borderRadius: '20px',
                  fontSize: isMobile ? '0.7em' : '0.85em',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  🏁 {t('management.trajectory.arrival')} <strong style={{ color: '#f39c12' }}>
                    {currentPoint.moisRestants || 0} {t('management.trajectory.months')}
                  </strong>
                  <span style={{ color: '#ffa500' }}>📍 {isMobile ? '' : currentPoint.label}</span>
                </span>
                <button
                  onClick={() => setShowTrajectoireModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: isMobile ? '32px' : '40px',
                    height: isMobile ? '32px' : '40px',
                    color: 'white',
                    fontSize: isMobile ? '1em' : '1.2em',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ 
              display: isMobile ? 'flex' : 'grid', 
              flexDirection: isMobile ? 'column' : undefined,
              gridTemplateColumns: isMobile ? undefined : '280px 1fr', 
              gap: isMobile ? '20px' : '25px' 
            }}>
              {/* Sidebar - Votre Parcours */}
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '15px',
                padding: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '15px'
                }}>
                  <span style={{ fontSize: '1.2em' }}>🛤️</span>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '1em' }}>{t('management.trajectory.yourPath')}</h3>
                </div>

                {/* Barre de progression globale */}
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{ color: '#f39c12', fontSize: '0.9em' }}>📍</span>
                    <span style={{ color: 'white', fontWeight: 'bold' }}>
                      {currentPoint.globalProgress || 0}%
                    </span>
                  </div>
                  <div style={{
                    height: '8px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${currentPoint.globalProgress || 0}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #3498db, #667eea)',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '0.75em', color: '#a0a0a0', textAlign: 'center' }}>
                    Point {selectedTrajectoirePoint.index + 1} / {trajectoirePoints.length}
                  </p>
                </div>

                {/* Liste des points */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {trajectoirePoints.map((point, idx) => {
                    const isSelected = idx === selectedTrajectoirePoint.index;
                    const pointColor = point.type === 'today' ? '#f39c12' : getCompteColor(accounts.find(a => a.nom === point.compte)?.type || 'cheque');

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedTrajectoirePoint({ type: point.type, index: idx })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          background: isSelected ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.05)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          border: isSelected ? '2px solid #667eea' : '2px solid transparent',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${pointColor}, ${pointColor}88)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '0.9em'
                        }}>
                          {point.type === 'today' ? '📍' : `${point.progression}%`}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ 
                            margin: 0, 
                            color: isSelected ? 'white' : '#e0e0e0', 
                            fontWeight: isSelected ? 'bold' : 'normal',
                            fontSize: '0.9em'
                          }}>
                            {point.label}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: '0.75em', color: '#a0a0a0' }}>
                            {point.date.toLocaleDateString(i18n.language === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        {point.type !== 'today' && (
                          <span style={{
                            background: 'rgba(255,255,255,0.1)',
                            color: '#a0c4ff',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '0.7em'
                          }}>
                            {point.progression}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Contenu principal - Soldes à la date sélectionnée */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '20px'
                }}>
                  <span style={{ fontSize: '1.3em' }}>🏦</span>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '1.1em' }}>
                    {t('management.trajectory.balancesAt')} – {currentPoint.label}
                  </h3>
                  <span style={{ fontSize: '0.85em', color: '#a0a0a0' }}>
                    {currentPoint.date.toLocaleDateString(i18n.language === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                  gap: isMobile ? '12px' : '15px' 
                }}>
                  {accounts.map((acc, idx) => {
                    const soldeData = currentSoldes[acc.nom];
                    const solde = soldeData?.solde || 0;
                    const todaySolde = todaySoldes[acc.nom]?.solde || 0;
                    const variation = solde - todaySolde;
                    const isCredit = acc.type === 'credit';
                    const color = getCompteColor(acc.type);

                    // Trouver si c'est l'objectif sélectionné
                    const isGoalAccount = currentPoint.type === 'goal' && currentPoint.compte === acc.nom;

                    return (
                      <div
                        key={idx}
                        style={{
                          background: 'white',
                          borderRadius: '15px',
                          padding: '20px',
                          border: isGoalAccount ? `3px solid ${color}` : 'none',
                          boxShadow: isGoalAccount ? `0 5px 20px ${color}40` : '0 3px 15px rgba(0,0,0,0.1)',
                          position: 'relative'
                        }}
                      >
                        {isGoalAccount && (
                          <span style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '15px',
                            fontSize: '1.5em'
                          }}>⭐</span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <span style={{ fontSize: '1.5em' }}>{getCompteIcon(acc.type)}</span>
                          <span style={{ fontWeight: '600', color: '#2c3e50' }}>{acc.nom}</span>
                        </div>
                        <p style={{
                          margin: '0 0 8px',
                          fontSize: '1.8em',
                          fontWeight: 'bold',
                          color: isCredit ? '#ffa500' : '#3498db'
                        }}>
                          {formatMontant(solde)}
                        </p>
                        {currentPoint.type !== 'today' && (
                          <span style={{
                            fontSize: '0.85em',
                            color: isCredit 
                              ? (variation < 0 ? '#3498db' : '#ffa500')
                              : (variation > 0 ? '#3498db' : '#ffa500'),
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            {variation > 0 ? '📈' : '📉'} {variation > 0 ? '+' : ''}{formatMontant(variation)} {t('management.trajectory.vsToday')}
                          </span>
                        )}

                        {/* Objectif si c'est le compte concerné */}
                        {isGoalAccount && (
                          <div style={{
                            marginTop: '15px',
                            padding: '12px',
                            background: '#f0f8ff',
                            borderRadius: '10px'
                          }}>
                            <p style={{ margin: '0 0 8px', fontSize: '0.85em', color: '#7f8c8d' }}>
                              🎯 {t('management.trajectory.goalTarget')}: {formatMontant(currentPoint.montantCible)}
                            </p>
                            <div style={{
                              height: '8px',
                              background: '#e0e0e0',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${currentPoint.progression}%`,
                                height: '100%',
                                background: `linear-gradient(90deg, ${color}, ${color}88)`,
                                borderRadius: '4px'
                              }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Recommandation */}
                <div style={{
                  marginTop: '20px',
                  padding: '20px',
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))',
                  borderRadius: '15px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '1.3em' }}>💡</span>
                    <h4 style={{ margin: 0, color: '#f39c12', fontSize: '1em' }}>{t('management.recommendation.title')}</h4>
                  </div>
                  <p style={{ margin: 0, color: '#e0e0e0', fontSize: '0.95em', lineHeight: '1.6' }}>
                    {currentPoint.type === 'today' 
                      ? t('management.recommendation.selectGoal')
                      : t('management.recommendation.updateBudget')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de demande avec confidentialité */}
      {showRequestModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => setShowRequestModal(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '4em', display: 'block', marginBottom: '15px' }}>🚀</span>
              <h2 style={{ margin: '0 0 10px', color: '#2c3e50' }}>
                {t('management.request.title')}
              </h2>
              <p style={{ margin: '0 0 20px', color: '#7f8c8d', lineHeight: '1.6' }}>
                {t('management.request.description')}
              </p>

              <div style={{
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '12px',
                marginBottom: '15px',
                textAlign: 'left'
              }}>
                <p style={{ margin: 0, fontSize: '0.9em', color: '#2c3e50' }}>
                  ✅ {t('management.request.benefits').split('\n')[0]}<br/>
                  ✅ {t('management.request.benefits').split('\n')[1]}
                </p>
              </div>

              {/* Message de confidentialité */}
              <div style={{
                padding: '15px',
                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid #2196f3',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '1.5em' }}>🔒</span>
                  <div>
                    <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: '#1565c0', fontSize: '0.95em' }}>
                      {t('management.request.privacy')}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85em', color: '#1976d2', lineHeight: '1.5' }}>
                      {t('management.request.privacyMessage')}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowRequestModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    borderRadius: '12px',
                    border: '2px solid #e0e0e0',
                    background: 'white',
                    color: '#7f8c8d',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '1em'
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={requestImprovement}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                    fontSize: '1em'
                  }}
                >
                  {t('management.request.send')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation */}
      {showConfirmModal && proposedReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => setShowConfirmModal(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(52, 152, 219, 0.3)',
            border: '3px solid #3498db'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '4em', display: 'block', marginBottom: '15px' }}>✅</span>
              <h2 style={{ margin: '0 0 10px', color: '#3498db' }}>
                Confirmer l'amélioration
              </h2>
              <p style={{ margin: '0 0 20px', color: '#7f8c8d', lineHeight: '1.6' }}>
                En acceptant, vos budgets futurs seront mis à jour selon la proposition de l'expert. 
                Cette action remplacera votre configuration actuelle.
              </p>

              <div style={{
                padding: '15px',
                background: 'rgba(243, 156, 18, 0.1)',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid #f39c12'
              }}>
                <p style={{ margin: 0, fontSize: '0.85em', color: '#e67e22' }}>
                  ⚠️ Cette action est irréversible. Assurez-vous d'avoir vérifié la proposition.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    borderRadius: '12px',
                    border: '2px solid #e0e0e0',
                    background: 'white',
                    color: '#7f8c8d',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={acceptImprovement}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(52, 152, 219, 0.4)'
                  }}
                >
                  Oui, appliquer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL PROPOSITION OPE (UTILISATEUR) ===== */}
      {showProposalModal && proposalData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2001,
          padding: '20px'
        }}>
          <div style={{
            background: isDark ? 'linear-gradient(180deg, #0a0354 0%, #100261 100%)' : '#ffffff',
            borderRadius: '20px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            border: '2px solid rgba(39, 174, 96, 0.5)',
            boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.15)'
          }}>
            {/* Header du modal */}
            <div style={{
              padding: '20px 25px',
              borderBottom: '2px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.3) 0%, rgba(46, 204, 113, 0.2) 100%)'
            }}>
              <div>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                  📈 Proposition d'optimisation
                </h2>
                <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.85em' }}>
                  PL4TO a analysé votre trajectoire financière
                </p>
              </div>
              <button
                onClick={() => setShowProposalModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  background: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1em'
                }}
              >
                ✕
              </button>
            </div>

            {/* Corps du modal */}
            <div style={{
              padding: '25px',
              maxHeight: 'calc(90vh - 200px)',
              overflowY: 'auto'
            }}>
              {(() => {
                const recommendations = proposalData.proposedChanges?.recommendations || [];
                const impact = proposalData.projectedImpact || {};
                
                // Utiliser les totaux mensuels envoyés par l'admin
                const totalCurrentPayments = proposalData.proposedChanges?.totalCurrentPaymentsMonthly || 
                  recommendations.reduce((sum, rec) => sum + (rec.currentAmountMonthly || rec.currentAmount || 0), 0);
                const totalNewPayments = proposalData.proposedChanges?.totalNewPaymentsMonthly || 
                  recommendations.reduce((sum, rec) => sum + (rec.newAmountMonthly || rec.newAmount || 0), 0);
                const monthlyRecovery = impact.monthlyRecovery || (totalCurrentPayments - totalNewPayments);
                const reductionPercent = totalCurrentPayments > 0 
                  ? Math.round(((totalCurrentPayments - totalNewPayments) / totalCurrentPayments) * 100)
                  : 0;
                
                // Première date d'intervention
                const firstInterventionDate = recommendations
                  .map(rec => rec.interventionDate)
                  .sort()[0];
                const firstInterventionLabel = firstInterventionDate 
                  ? new Date(firstInterventionDate).toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'bientôt';

                return (
                  <>
                    {/* Message explicatif */}
                    <div style={{
                      background: 'rgba(52, 152, 219, 0.15)',
                      borderRadius: '15px',
                      padding: '20px',
                      marginBottom: '25px',
                      border: '2px solid rgba(52, 152, 219, 0.3)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.1em', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
                        Vos paiements génèrent un <strong style={{ color: '#f39c12' }}>surplus</strong> sur vos comptes crédit.
                      </div>
                      <div style={{ fontSize: '1em', color: 'rgba(255,255,255,0.8)', marginTop: '10px' }}>
                        En ajustant vos paiements à votre budget réel à partir de <strong style={{ color: '#3498db' }}>{firstInterventionLabel}</strong>:
                      </div>
                    </div>

                    {/* Gros pourcentage de réduction */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.25) 0%, rgba(46, 204, 113, 0.15) 100%)',
                      borderRadius: '20px',
                      padding: '35px 25px',
                      marginBottom: '25px',
                      border: '3px solid rgba(39, 174, 96, 0.5)',
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        fontSize: '4em', 
                        fontWeight: 'bold', 
                        color: '#27ae60',
                        marginBottom: '10px',
                        textShadow: '0 2px 10px rgba(39, 174, 96, 0.3)'
                      }}>
                        -{reductionPercent}%
                      </div>
                      <div style={{ 
                        fontSize: '1.3em', 
                        color: 'white',
                        fontWeight: '600'
                      }}>
                        📉 Réduisez vos paiements de {reductionPercent}%
                      </div>
                      <div style={{ 
                        fontSize: '0.95em', 
                        color: 'rgba(255,255,255,0.7)',
                        marginTop: '15px'
                      }}>
                        {formatMontant(totalCurrentPayments)}/mois → {formatMontant(totalNewPayments)}/mois
                      </div>
                      <div style={{ 
                        fontSize: '1.1em', 
                        color: '#27ae60',
                        marginTop: '10px',
                        fontWeight: 'bold'
                      }}>
                        Économie: +{formatMontant(monthlyRecovery)}/mois
                      </div>
                    </div>

                    {/* Impact cumulé - version compacte */}
                    <div style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      padding: '15px',
                      marginBottom: '20px'
                    }}>
                      <div style={{ 
                        fontSize: '0.85em', 
                        color: 'rgba(255,255,255,0.6)', 
                        marginBottom: '10px',
                        textAlign: 'center'
                      }}>
                        📈 Impact cumulé de l'économie
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}>
                        {[
                          { label: '1 an', value: monthlyRecovery * 12 },
                          { label: '5 ans', value: monthlyRecovery * 12 * 5 },
                          { label: '10 ans', value: monthlyRecovery * 12 * 10 },
                          { label: '15 ans', value: monthlyRecovery * 12 * 15 }
                        ].map((period, idx) => (
                          <div
                            key={idx}
                            style={{
                              flex: 1,
                              background: idx === 3 ? 'rgba(39, 174, 96, 0.2)' : 'rgba(52, 152, 219, 0.1)',
                              borderRadius: '8px',
                              padding: '10px 5px',
                              textAlign: 'center'
                            }}
                          >
                            <div style={{ fontSize: '0.7em', color: 'rgba(255,255,255,0.5)' }}>
                              {period.label}
                            </div>
                            <div style={{
                              fontSize: idx === 3 ? '0.95em' : '0.85em',
                              fontWeight: 'bold',
                              color: idx === 3 ? '#27ae60' : '#3498db',
                              marginTop: '3px'
                            }}>
                              +{formatMontant(period.value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Détail des ajustements - compact */}
                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '10px',
                      padding: '12px',
                      marginBottom: '15px'
                    }}>
                      <div style={{ 
                        fontSize: '0.8em', 
                        color: 'rgba(255,255,255,0.5)', 
                        marginBottom: '8px' 
                      }}>
                        Détail des ajustements ({recommendations.length})
                      </div>
                      {recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 0',
                            borderBottom: idx < recommendations.length - 1 
                              ? '1px solid rgba(255,255,255,0.1)' 
                              : 'none'
                          }}
                        >
                          <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.8)' }}>
                            {rec.accountName}
                            <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '8px' }}>
                              {formatMontant(rec.currentAmountMonthly || rec.currentAmount)} → {formatMontant(rec.newAmountMonthly || rec.newAmount)}/mois
                            </span>
                          </div>
                          <div style={{ 
                            fontSize: '0.85em', 
                            fontWeight: 'bold', 
                            color: '#27ae60' 
                          }}>
                            +{formatMontant(rec.monthlyRecovery)}/mois
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Footer avec boutons Refuser / Accepter */}
            <div style={{
              padding: '20px 25px',
              borderTop: '2px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.2)',
              gap: '15px'
            }}>
              <button
                onClick={rejectProposal}
                disabled={isAcceptingProposal}
                style={{
                  flex: 1,
                  padding: '15px 25px',
                  borderRadius: '12px',
                  border: '2px solid #e74c3c',
                  background: 'transparent',
                  color: '#e74c3c',
                  cursor: isAcceptingProposal ? 'not-allowed' : 'pointer',
                  fontSize: '1em',
                  fontWeight: 'bold',
                  opacity: isAcceptingProposal ? 0.5 : 1
                }}
              >
                ❌ Refuser
              </button>
              <button
                onClick={acceptImprovement}
                disabled={isAcceptingProposal}
                style={{
                  flex: 1,
                  padding: '15px 25px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isAcceptingProposal 
                    ? 'rgba(39, 174, 96, 0.5)' 
                    : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                  color: 'white',
                  cursor: isAcceptingProposal ? 'not-allowed' : 'pointer',
                  fontSize: '1em',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)'
                }}
              >
                {isAcceptingProposal ? '⏳ Application...' : '✅ Accepter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL GUIDE ONBOARDING ===== */}
      <PageGuideModal
        isOpen={showGuide}
        onClose={closeModal}
        icon="📋"
        titleKey="management.guideModal.title"
        messageKey="management.guideModal.message"
        hintIcon="👆"
        hintKey="management.guideModal.hint"
      />
      
      {/* 🎯 Tour de Tooltips Interactifs */}
      <TooltipTour
        isActive={isTooltipActive}
        currentTooltip={currentTooltip}
        currentStep={currentStep}
        totalSteps={totalSteps}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipAll}
      />
    </>
  );
};

export default GestionComptes;
