// 🎯 GPS FINANCIER - DASHBOARD PRINCIPAL
// Mode plein écran: premier clic active le plein écran
// 🌍 i18n enabled
// ✅ Utilise useGuideProgress pour la logique centralisée

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useUserData } from '../../context/UserDataContext';
import CalendrierO from '../../components/dashboard/CalendrierO';
import useGuideProgress from '../../hooks/useGuideProgress';
import PageGuideModal from '../../components/common/PageGuideModal';
import TrialWelcomeModal from '../../components/common/TrialWelcomeModal';
import useTrialReminders from '../../hooks/useTrialReminders';
import { useTheme } from '../../context/ThemeContext';
// 🎯 Tooltips interactifs
import useTooltipTour from '../../hooks/useTooltipTour';
import TooltipTour from '../../components/common/TooltipTour';

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { userData, isLoading: isUserDataLoading } = useUserData();
  const navigate = useNavigate();
  const [showContinueBar, setShowContinueBar] = useState(false);
  
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
      // Si on passe de desktop à mobile, activer plein écran
      // Si on passe de mobile à desktop, désactiver plein écran
      setIsFullScreen(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // ✅ État pour savoir si l'utilisateur a fermé le modal manuellement
  const [modalDismissed, setModalDismissed] = useState(false);
  
  // ✅ Hook centralisé pour la progression du guide
  const { isPageAccessible, shouldShowGuide, markGuideCompleted, isGuideComplete, isLoading: isGuideLoading } = useGuideProgress();
  
  // 🎨 Theme support
  const { isDark } = useTheme();
  
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
  } = useTooltipTour('dashboard', {
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
    window.startDashboardTour = () => {
      resetTooltips();
      setTimeout(() => startTooltipTour(), 100);
    };
    return () => delete window.startDashboardTour;
  }, [startTooltipTour, resetTooltips]);
  
  // 🎉 Hook pour les rappels trial (utilise le backend)
  const { 
    showModal: showTrialWelcome, 
    popupType: trialPopupType, 
    daysRemaining: trialDaysRemaining,
    closeModal: closeTrialModal,
    refreshStatus: refreshTrialStatus
  } = useTrialReminders();
  
  // 🎓 Détecter si on arrive après l'onboarding
  const [searchParams, setSearchParams] = useSearchParams();
  const isFromOnboarding = searchParams.get('onboarding') === 'complete';
  
  // 🔄 Forcer le refresh du statut trial si on arrive après l'onboarding
  useEffect(() => {
    if (isFromOnboarding) {
      console.log('[Dashboard] 🎓 Arrivée après onboarding - refresh trial status');
      // Petit délai pour laisser le backend traiter startTrial()
      const timer = setTimeout(() => {
        refreshTrialStatus();
        // Nettoyer le paramètre URL
        setSearchParams({}, { replace: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isFromOnboarding, refreshTrialStatus, setSearchParams]);

  // 🔧 FIX: État pour tracker si le TrialWelcomeModal a été fermé
  const [trialModalDismissed, setTrialModalDismissed] = useState(false);
  
  // 🔧 FIX: ORDRE DES MODALS POUR NOUVEAUX UTILISATEURS:
  // 1. TrialWelcomeModal EN PREMIER (bienvenue + info trial)
  // 2. PageGuideModal EN SECOND (après fermeture du trial modal)
  // 3. TooltipTour EN TROISIÈME (après fermeture du guide modal)
  
  // Le TrialWelcomeModal s'affiche si:
  // - Le hook dit de l'afficher (showTrialWelcome)
  // - L'utilisateur ne l'a pas encore fermé dans cette session
  const showTrialModal = showTrialWelcome && !trialModalDismissed;
  
  // Le PageGuideModal s'affiche si:
  // - Le guide dashboard doit être affiché (shouldShowGuide)
  // - Le TrialModal n'est PAS affiché (priorité au trial)
  // - L'utilisateur n'a pas fermé le modal manuellement
  const showWelcome = !isGuideLoading && shouldShowGuide('dashboard') && !modalDismissed && !showTrialModal;
  
  // Debug logs
  useEffect(() => {
    console.log('[Dashboard] === État actuel ===');
    console.log('[Dashboard] isGuideLoading:', isGuideLoading);
    console.log('[Dashboard] shouldShowGuide(dashboard):', shouldShowGuide('dashboard'));
    console.log('[Dashboard] modalDismissed:', modalDismissed);
    console.log('[Dashboard] trialModalDismissed:', trialModalDismissed);
    console.log('[Dashboard] showTrialWelcome (hook):', showTrialWelcome);
    console.log('[Dashboard] showTrialModal (calculé):', showTrialModal);
    console.log('[Dashboard] showWelcome (calculé):', showWelcome);
  }, [isGuideLoading, modalDismissed, trialModalDismissed, showWelcome, showTrialWelcome, showTrialModal, shouldShowGuide]);
  
  // 🔧 FIX: Fermer le TrialModal et ensuite le PageGuideModal s'affichera automatiquement
  const handleCloseTrialModal = () => {
    setTrialModalDismissed(true);
    closeTrialModal(); // Appeler aussi le hook pour marquer comme vu
  };

  // Fermer le modal et démarrer les tooltips
  const closeModal = () => {
    setModalDismissed(true);  // ✅ Marquer le modal comme fermé
    startTooltipTour(); // Démarre le tour de tooltips
  };

  // Marquer comme complété et passer à la page suivante
  const continueToNextPage = () => {
    setShowContinueBar(false);
    markGuideCompleted('dashboard');
    setTimeout(() => {
      navigate('/comptes');
    }, 100);
  };

  // 🎨 Formatage de la devise (locale-aware)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // 📅 Formatage de date (locale-aware)
  const formatDate = (dateStr) => {
    // Parser la date sans décalage de fuseau horaire
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  // 📊 Extraire les vraies données
  const financialGoals = userData?.financialGoals || [];
  const budgetSorties = userData?.budgetPlanning?.sorties || [];
  const budgetEntrees = userData?.budgetPlanning?.entrees || [];
  const soldes = userData?.initialBalances?.soldes || [];
  const accounts = userData?.accounts || [];

  // 🎯 Calculer la progression réelle des objectifs
  const getGoalProgress = (goal) => {
    const soldeInfo = soldes.find(s => s.accountName === goal.compteAssocie);
    const accountInfo = accounts.find(a => a.nom === goal.compteAssocie);
    const currentAmount = parseFloat(soldeInfo?.solde) || 0;
    const targetAmount = parseFloat(goal.montantCible) || 1;
    const isCredit = accountInfo?.type === 'credit' || soldeInfo?.accountType === 'credit';
    const limite = parseFloat(accountInfo?.limite) || 0;
    
    let progress;
    let displayCurrent;
    let displayTarget;
    
    if (isCredit) {
      if (currentAmount <= targetAmount) {
        progress = 100;
      } else if (limite > 0 && limite >= currentAmount) {
        const totalToRepay = limite - targetAmount;
        const alreadyRepaid = limite - currentAmount;
        progress = totalToRepay > 0 ? (alreadyRepaid / totalToRepay) * 100 : 0;
      } else {
        progress = (targetAmount / currentAmount) * 100;
      }
      progress = Math.max(0, Math.min(progress, currentAmount <= targetAmount ? 100 : 99.99));
      displayCurrent = targetAmount;
      displayTarget = currentAmount;
    } else {
      progress = Math.min((currentAmount / targetAmount) * 100, 100);
      displayCurrent = currentAmount;
      displayTarget = targetAmount;
    }
    
    progress = Math.round(progress * 100) / 100;
    
    return {
      ...goal,
      current: displayCurrent,
      target: displayTarget,
      realCurrent: currentAmount,
      realTarget: targetAmount,
      progress,
      isCredit
    };
  };

  const activeGoals = financialGoals.map(getGoalProgress);

  // 💳 Prochaines dépenses (sorties du budget) - Utilise la même logique que GPSFinancier
  const getUpcomingExpenses = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const results = [];
    
    // Helper function identique à GPSFinancier
    const parseLocalDate = (dateStr) => {
      if (!dateStr) return null;
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    
    // Vérifier si une transaction correspond à une date donnée (même logique que GPS)
    const checkTransactionForDate = (date, item) => {
      const dateDay = date.getDate();
      const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      const jour = parseInt(item.jourRecurrence) || 1;
      
      const checkDayMatch = (jourRecurrence) => {
        if (jourRecurrence > lastDayOfMonth) {
          return dateDay === lastDayOfMonth;
        }
        return dateDay === jourRecurrence;
      };
      
      switch (item.frequence) {
        case 'mensuel':
          return checkDayMatch(jour);
        case 'quinzaine':
          const firstDay = Math.min(jour, lastDayOfMonth);
          const secondDay = Math.min(jour + 15, lastDayOfMonth);
          return dateDay === firstDay || dateDay === secondDay;
        case 'bimensuel':
          if (item.jourSemaine && item.dateReference) {
            const refDate = parseLocalDate(item.dateReference);
            if (!refDate) return false;
            const diffTime = date.getTime() - refDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays % 14 === 0;
          } else {
            return checkDayMatch(jour);
          }
        case 'hebdomadaire':
          if (item.jourSemaine !== undefined && item.jourSemaine !== '') {
            return date.getDay() === parseInt(item.jourSemaine);
          } else {
            return date.getDay() === (jour % 7);
          }
        case 'trimestriel':
          if (item.dateDepart) {
            const startDate = parseLocalDate(item.dateDepart);
            if (!startDate) return false;
            const startDay = startDate.getDate();
            const startMonth = startDate.getMonth();
            const startYear = startDate.getFullYear();
            const currentMonth = date.getMonth();
            const currentYear = date.getFullYear();
            if (item.dateFinRecurrence) {
              const endDate = parseLocalDate(item.dateFinRecurrence);
              if (endDate && date > endDate) return false;
            }
            const monthsDiff = (currentYear - startYear) * 12 + (currentMonth - startMonth);
            return monthsDiff >= 0 && monthsDiff % 3 === 0 && checkDayMatch(startDay);
          } else {
            return checkDayMatch(jour) && date.getMonth() % 3 === 0;
          }
        case 'semestriel':
          if (item.dateDepart) {
            const startDate = parseLocalDate(item.dateDepart);
            if (!startDate) return false;
            const startDay = startDate.getDate();
            const startMonth = startDate.getMonth();
            const startYear = startDate.getFullYear();
            const currentMonth = date.getMonth();
            const currentYear = date.getFullYear();
            if (item.dateFinRecurrence) {
              const endDate = parseLocalDate(item.dateFinRecurrence);
              if (endDate && date > endDate) return false;
            }
            const monthsDiff = (currentYear - startYear) * 12 + (currentMonth - startMonth);
            return monthsDiff >= 0 && monthsDiff % 6 === 0 && checkDayMatch(startDay);
          } else {
            return checkDayMatch(jour) && (date.getMonth() === 0 || date.getMonth() === 6);
          }
        case 'uneFois':
        case '1-fois':
          if (item.dateDepart || item.date) {
            const targetDate = parseLocalDate(item.dateDepart || item.date);
            if (!targetDate) return false;
            return date.getFullYear() === targetDate.getFullYear() &&
                   date.getMonth() === targetDate.getMonth() &&
                   date.getDate() === targetDate.getDate();
          }
          return false;
        case 'annuel':
          const targetMonth = item.moisRecurrence ? (parseInt(item.moisRecurrence) - 1) : 0;
          return checkDayMatch(jour) && date.getMonth() === targetMonth;
        default:
          return checkDayMatch(jour);
      }
    };
    
    // Itérer sur les 90 prochains jours pour trouver les prochaines transactions
    const maxDays = 90;
    const processedItems = new Set(); // Pour éviter les doublons (une seule prochaine date par item)
    
    for (let dayOffset = 1; dayOffset <= maxDays; dayOffset++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + dayOffset);
      
      budgetSorties.forEach((sortie, index) => {
        const itemKey = sortie.id || `sortie-${index}`;
        
        // Si on a déjà trouvé la prochaine date pour cet item, skip
        if (processedItems.has(itemKey)) return;
        
        if (checkTransactionForDate(checkDate, sortie)) {
          processedItems.add(itemKey);
          const amount = parseFloat(sortie.montant) || 0;
          let priority = 'low';
          if (amount >= 500) priority = 'high';
          else if (amount >= 100) priority = 'medium';
          
          results.push({
            id: sortie.id || index + 1,
            name: sortie.description || t('budget.expenses'),
            amount: amount,
            date: checkDate.toISOString().split('T')[0],
            type: 'expense',
            priority: priority,
            frequence: sortie.frequence
          });
        }
      });
    }
    
    // Trier par date
    return results.sort((a, b) => new Date(a.date) - new Date(b.date));
  };
  
  const upcomingExpenses = getUpcomingExpenses();

  // 🔔 Générer des alertes dynamiques
  const generateAlerts = () => {
    const alerts = [];
    
    activeGoals.forEach(goal => {
      if (goal.progress >= 80 && goal.progress < 100) {
        alerts.push({
          id: `goal-near-${goal.id}`,
          message: goal.isCredit 
            ? `"${goal.nom}" ${t('dashboard.alerts.almostReachedKeepGoing')} 💪`
            : `"${goal.nom}" ${t('dashboard.alerts.almostReached')} 🎉`,
          type: 'success'
        });
      }
    });

    activeGoals.forEach(goal => {
      if (goal.progress >= 100) {
        alerts.push({
          id: `goal-complete-${goal.id}`,
          message: `${t('dashboard.alerts.congratulations')} "${goal.nom}" ${t('dashboard.alerts.reached')} 🏆`,
          type: 'success'
        });
      }
    });

    accounts.forEach(account => {
      if (account.type === 'credit' && account.limite) {
        const soldeInfo = soldes.find(s => s.accountName === account.nom);
        const solde = parseFloat(soldeInfo?.solde) || 0;
        const limite = parseFloat(account.limite) || 1;
        const utilisation = (solde / limite) * 100;
        
        if (utilisation >= 80) {
          alerts.push({
            id: `credit-limit-${account.nom}`,
            message: `${account.nom} ${t('dashboard.alerts.approachingLimit')}`,
            type: 'warning'
          });
        }
      }
    });

    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const bigExpenses = upcomingExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate <= nextWeek && expenseDate >= today && expense.amount >= 500;
    });

    if (bigExpenses.length > 0) {
      alerts.push({
        id: 'big-expense-coming',
        message: t('dashboard.alerts.largeTransaction'),
        type: 'warning'
      });
    }

    accounts.forEach(account => {
      if (account.type !== 'credit') {
        const soldeInfo = soldes.find(s => s.accountName === account.nom);
        const solde = parseFloat(soldeInfo?.solde) || 0;
        if (solde < 0) {
          alerts.push({
            id: `negative-${account.nom}`,
            message: `${account.nom} ${t('dashboard.alerts.isNegative')}`,
            type: 'warning'
          });
        }
      }
    });

    if (financialGoals.length === 0) {
      alerts.push({
        id: 'no-goals',
        message: t('dashboard.alerts.noGoals'),
        type: 'info'
      });
    }

    if (budgetSorties.length === 0 && budgetEntrees.length === 0) {
      alerts.push({
        id: 'no-budget',
        message: t('dashboard.alerts.noBudget'),
        type: 'info'
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: 'welcome',
        message: t('dashboard.alerts.welcome'),
        type: 'success'
      });
    }

    return alerts.slice(0, 4);
  };

  const alerts = generateAlerts();

  const getGoalColor = (type) => {
    const colors = {
      'epargne': '#27ae60',
      'investissement': '#9b59b6',
      'remboursement': '#e74c3c',
      'achat': '#3498db',
      'voyage': '#f39c12',
      'urgence': '#1abc9c'
    };
    return colors[type] || '#4CAF50';
  };

  const getAlertStyle = (type) => {
    if (type === 'warning') return { bg: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)', border: '#ffb74d', icon: '⚠️' };
    if (type === 'success') return { bg: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', border: '#81c784', icon: '✨' };
    return { bg: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', border: '#64b5f6', icon: '💡' };
  };

  // ✅ Vérifier l'accessibilité des pages avec le hook centralisé
  const gpsAccessible = isPageAccessible('/gps');
  const objectifsAccessible = isPageAccessible('/objectifs');

  // Contenu réutilisable (mode normal et plein écran)
  const renderContent = (interactive = false) => (
    <>
      {/* SECTION 1: CALENDRIER O */}
      <CalendrierO interactive={interactive} isMobile={isMobile} />

      {/* SECTION 2: TABLEAU DE BORD */}
      <div>
        <h2 style={{ 
          fontSize: isMobile ? '1.4em' : '1.8em', 
          fontWeight: 'bold', 
          color: isDark ? 'white' : '#1e293b',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '8px',
            padding: isMobile ? '5px 8px' : '6px 10px',
            fontSize: '0.8em'
          }}>📊</span>
          {t('dashboard.title')}
        </h2>

        {/* 3 CARTES - Responsive */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
          gap: isMobile ? '15px' : '20px'
        }}>
          {/* CARTE 1: Alertes */}
          <div
            data-tooltip="alerts"
            onClick={interactive && gpsAccessible ? () => navigate('/gps') : undefined}
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
              borderRadius: isMobile ? '14px' : '16px',
              padding: isMobile ? '15px' : '20px',
              boxShadow: isDark ? '0 4px 15px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.08)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
              transition: 'all 0.3s',
              position: 'relative',
              overflow: 'hidden',
              cursor: interactive && gpsAccessible ? 'pointer' : 'default',
              pointerEvents: interactive ? 'auto' : 'none',
              opacity: interactive && !gpsAccessible ? 0.7 : 1
            }}
            onMouseEnter={interactive && gpsAccessible ? (e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.3)';
            } : undefined}
            onMouseLeave={interactive && gpsAccessible ? (e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            } : undefined}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #ff9800, #ffc107)'
            }} />
            
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: isMobile ? '12px' : '15px'
            }}>
              <div style={{
                width: isMobile ? '36px' : '40px',
                height: isMobile ? '36px' : '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ff980020 0%, #ffc10720 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.1em' : '1.3em'
              }}>
                🔔
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: isMobile ? '0.95em' : '1em', fontWeight: 'bold', color: isDark ? 'white' : '#1e293b' }}>
                  {t('dashboard.alerts.title')}
                </h3>
                <p style={{ margin: 0, fontSize: isMobile ? '0.7em' : '0.75em', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>
                  {alerts.length} {alerts.length > 1 ? t('dashboard.alerts.notifications') : t('dashboard.alerts.notification')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '6px' : '8px' }}>
              {alerts.slice(0, 3).map((alert) => {
                const style = getAlertStyle(alert.type);
                return (
                  <div 
                    key={alert.id} 
                    style={{
                      background: style.bg,
                      borderRadius: isMobile ? '8px' : '10px',
                      padding: isMobile ? '8px 10px' : '10px 12px',
                      borderLeft: `3px solid ${style.border}`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontSize: isMobile ? '0.8em' : '0.9em' }}>{style.icon}</span>
                    <p style={{ fontSize: isMobile ? '0.75em' : '0.8em', fontWeight: '500', color: '#2c3e50', margin: 0, lineHeight: '1.3' }}>
                      {alert.message}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CARTE 2: Prochaines dépenses */}
          <div
            data-tooltip="transactions"
            onClick={interactive && gpsAccessible ? () => navigate('/gps') : undefined}
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
              borderRadius: isMobile ? '14px' : '16px',
              padding: isMobile ? '15px' : '20px',
              boxShadow: isDark ? '0 4px 15px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.08)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
              transition: 'all 0.3s',
              position: 'relative',
              overflow: 'hidden',
              cursor: interactive && gpsAccessible ? 'pointer' : 'default',
              pointerEvents: interactive ? 'auto' : 'none',
              opacity: interactive && !gpsAccessible ? 0.7 : 1
            }}
            onMouseEnter={interactive && gpsAccessible ? (e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.3)';
            } : undefined}
            onMouseLeave={interactive && gpsAccessible ? (e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            } : undefined}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #ffa500, #ff6b00)'
            }} />
            
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: isMobile ? '12px' : '15px'
            }}>
              <div style={{
                width: isMobile ? '36px' : '40px',
                height: isMobile ? '36px' : '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ffa50020 0%, #ff6b0020 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.1em' : '1.3em'
              }}>
                💳
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: isMobile ? '0.95em' : '1em', fontWeight: 'bold', color: isDark ? 'white' : '#1e293b' }}>
                  {t('dashboard.upcoming.title')}
                </h3>
                <p style={{ margin: 0, fontSize: isMobile ? '0.7em' : '0.75em', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>
                  {upcomingExpenses.length} {upcomingExpenses.length > 1 ? t('dashboard.upcoming.stopsPlanned') : t('dashboard.upcoming.stopPlanned')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '5px' : '6px' }}>
              {upcomingExpenses.length > 0 ? upcomingExpenses.slice(0, 3).map((expense) => {
                const expenseDate = new Date(expense.date);
                return (
                  <div 
                    key={expense.id}
                    onClick={() => {
                      if (interactive) {
                        navigate('/gps', {
                          state: {
                            targetDate: expense.date,
                            targetMonth: expenseDate.getMonth(),
                            targetYear: expenseDate.getFullYear(),
                            eventTitle: expense.name,
                            viewMode: 'day',
                            startInNormalMode: true
                          }
                        });
                      }
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: isMobile ? '6px 8px' : '8px 10px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      borderRadius: isMobile ? '6px' : '8px',
                      cursor: interactive ? 'pointer' : 'default',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (interactive) {
                        e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: '600', color: isDark ? 'white' : '#1e293b', margin: 0, fontSize: isMobile ? '0.8em' : '0.85em' }}>
                        {expense.name}
                      </p>
                      <p style={{ fontSize: isMobile ? '0.65em' : '0.7em', color: interactive ? '#3498db' : (isDark ? 'rgba(255,255,255,0.6)' : '#64748b'), margin: '2px 0 0', textDecoration: interactive ? 'underline' : 'none' }}>
                        📅 {formatDate(expense.date)} {interactive && '→'}
                      </p>
                    </div>
                    <p style={{ fontWeight: 'bold', color: '#ffa500', margin: 0, fontSize: isMobile ? '0.85em' : '0.9em' }}>
                      -{formatCurrency(expense.amount)}
                    </p>
                  </div>
                );
              }) : (
                <div style={{ textAlign: 'center', padding: isMobile ? '12px 0' : '15px 0' }}>
                  <p style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', fontSize: isMobile ? '0.8em' : '0.85em', marginBottom: '5px' }}>
                    {t('dashboard.upcoming.noStops')}
                  </p>
                  <span style={{ color: '#3498db', fontSize: isMobile ? '0.75em' : '0.8em', fontWeight: '600' }}>
                    {t('dashboard.upcoming.exploreJourney')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CARTE 3: Objectifs en cours */}
          <div
            data-tooltip="destinations"
            onClick={interactive && objectifsAccessible ? () => navigate('/objectifs') : undefined}
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
              borderRadius: isMobile ? '14px' : '16px',
              padding: isMobile ? '15px' : '20px',
              boxShadow: isDark ? '0 4px 15px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.08)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
              transition: 'all 0.3s',
              position: 'relative',
              overflow: 'hidden',
              cursor: interactive && objectifsAccessible ? 'pointer' : 'default',
              pointerEvents: interactive ? 'auto' : 'none',
              opacity: interactive && !objectifsAccessible ? 0.7 : 1
            }}
            onMouseEnter={interactive && objectifsAccessible ? (e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.3)';
            } : undefined}
            onMouseLeave={interactive && objectifsAccessible ? (e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            } : undefined}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #9b59b6, #e91e63)'
            }} />
            
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: isMobile ? '12px' : '15px'
            }}>
              <div style={{
                width: isMobile ? '36px' : '40px',
                height: isMobile ? '36px' : '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #9b59b620 0%, #e91e6320 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.1em' : '1.3em'
              }}>
                🧭
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: isMobile ? '0.95em' : '1em', fontWeight: 'bold', color: isDark ? 'white' : '#1e293b' }}>
                  {t('dashboard.goals.title')}
                </h3>
                <p style={{ margin: 0, fontSize: isMobile ? '0.7em' : '0.75em', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>
                  {activeGoals.length} {activeGoals.length > 1 ? t('dashboard.goals.destinations') : t('dashboard.goals.destination')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '10px' }}>
              {activeGoals.length > 0 ? activeGoals.slice(0, 3).map((goal) => {
                const goalColor = goal.isCredit ? '#ffa500' : getGoalColor(goal.type);
                return (
                  <div key={goal.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <p style={{ 
                        fontWeight: '600', 
                        color: isDark ? 'white' : '#1e293b', 
                        fontSize: isMobile ? '0.75em' : '0.8em', 
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: isMobile ? '180px' : '150px'
                      }}
                        title={goal.nom}
                      >
                        {goal.nom}
                      </p>
                      <p style={{ 
                        fontSize: isMobile ? '0.7em' : '0.75em', 
                        color: goal.progress >= 100 ? '#27ae60' : goalColor, 
                        margin: 0,
                        fontWeight: 'bold'
                      }}>
                        {goal.progress.toFixed(1)}%
                      </p>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', 
                      borderRadius: '8px', 
                      height: isMobile ? '5px' : '6px',
                      overflow: 'hidden'
                    }}>
                      <div 
                        style={{ 
                          background: goal.progress >= 100 
                            ? 'linear-gradient(90deg, #27ae60, #2ecc71)' 
                            : `linear-gradient(90deg, ${goalColor}, ${goalColor}dd)`,
                          height: isMobile ? '5px' : '6px', 
                          borderRadius: '8px',
                          width: `${Math.min(goal.progress, 100)}%`,
                          transition: 'width 0.5s ease-out'
                        }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <div style={{ textAlign: 'center', padding: isMobile ? '12px 0' : '15px 0' }}>
                  <p style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', fontSize: isMobile ? '0.8em' : '0.85em', marginBottom: '5px' }}>
                    {t('dashboard.goals.noDestinations')}
                  </p>
                  <span style={{ color: '#9b59b6', fontSize: isMobile ? '0.75em' : '0.8em', fontWeight: '600' }}>
                    {t('goals.addDestination')} →
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden' 
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

      {/* PLATEFORME PRINCIPALE - Premier clic = plein écran */}
      {/* 🔧 FIX: Ne rendre le mode aperçu que si PAS en plein écran */}
      {/* Sinon les data-tooltip existent en double et le highlight pointe au mauvais endroit */}
      {!isFullScreen && (
        <div 
          onClick={() => setIsFullScreen(true)}
          style={{
            position: 'relative',
            flex: 1,
            width: '100%',
            background: isDark ? 'linear-gradient(180deg, #040449 0%, #100261 100%)' : '#ffffff',
            overflow: 'hidden',
            cursor: 'pointer',
            padding: isMobile ? '15px 15px 15px 15px' : '25px 30px 25px 30px',
            borderTopLeftRadius: '0'
          }}
        >
          {/* Contenu en mode aperçu (non-interactif) */}
          {renderContent(false)}
        </div>
      )}

      {/* MODE PLEIN ÉCRAN */}
      {isFullScreen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isDark ? 'linear-gradient(180deg, #040449 0%, #100261 100%)' : '#ffffff',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header plein écran */}
          <div style={{ 
            padding: isMobile ? '15px 15px 10px 15px' : '12px 30px',
            // 📱 FIX: Mobile navigateur ET PWA ont besoin de padding suffisant
            // PWA: utilise safe-area-inset, Navigateur: 40px fixe (évite la barre d'adresse)
            paddingTop: isMobile 
              ? (isPWA ? 'max(50px, env(safe-area-inset-top, 50px))' : '40px')
              : '12px',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            background: 'transparent',
            flexShrink: 0
          }}>
            {/* Titre et bouton On continue - à gauche */}
            <div>
              <h1 style={{ 
                fontSize: isMobile ? '1.1em' : '1.3em', 
                fontWeight: 'bold', 
                color: isDark ? 'white' : '#1e293b', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                margin: 0
              }}>
                🏠 {t('nav.home')}
              </h1>
              
              {/* 📱 Mobile: Bouton "On continue!" dans le header (PWA ou navigateur) */}
              {showContinueBar && isMobile && (
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
                    marginTop: '10px'
                  }}
                >
                  {t('common.onContinue')} →
                </button>
              )}
            </div>
            
            <button
              onClick={() => {
                if (isMobile) {
                  // Mobile: ouvrir le menu sidebar
                  window.dispatchEvent(new CustomEvent('openSidebar'));
                } else {
                  // Desktop: revenir à la vue aperçu
                  setIsFullScreen(false);
                }
              }}
              style={{
                width: isMobile ? '44px' : '36px',
                height: isMobile ? '44px' : '36px',
                minWidth: isMobile ? '44px' : '36px',
                minHeight: isMobile ? '44px' : '36px',
                borderRadius: '50%',
                border: isDark ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(0,0,0,0.2)',
                background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                color: isDark ? 'white' : '#475569',
                fontSize: isMobile ? '1.2em' : '1.1em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s',
                touchAction: 'manipulation'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e74c3c';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = '#e74c3c';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
                e.currentTarget.style.color = isDark ? 'white' : '#475569';
                e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
              }}
            >
              ✕
            </button>
          </div>

          {/* Contenu plein écran (interactif) */}
          <div style={{ 
            flex: 1, 
            overflow: 'auto',
            padding: isMobile ? '15px 15px' : '20px 30px',
            background: 'transparent'
          }}>
            {renderContent(true)}
          </div>
          
          {/* 💡 Bouton d'aide - UNIQUEMENT en mode plein écran et si onboarding terminé */}
          {isGuideComplete && (
            <button
              onClick={() => {
                isManualTourRef.current = true; // Marquer comme tour manuel
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
              title="Aide - Voir le guide de la page"
              aria-label="Aide - Voir le guide de la page"
            >
              💡
            </button>
          )}
        </div>
      )}

      {/* ===== MODAL GUIDE ONBOARDING ===== */}
      <PageGuideModal
        isOpen={showWelcome}
        onClose={closeModal}
        icon="🏠"
        titleKey="dashboard.guideModal.title"
        messageKey="dashboard.guideModal.message"
        hintIcon="👆"
        hintKey="dashboard.guideModal.hint"
      />
      
      {/* ===== MODAL BIENVENUE TRIAL ===== */}
      {/* 🔧 FIX: S'affiche EN PREMIER, puis PageGuideModal après fermeture */}
      <TrialWelcomeModal
        isOpen={showTrialModal}
        onClose={handleCloseTrialModal}
        popupType={trialPopupType}
        daysRemaining={trialDaysRemaining}
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
        onComplete={continueToNextPage}
      />
    </div>
  );
};

export default Dashboard;
