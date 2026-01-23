// 🎯 GPS FINANCIER - DASHBOARD PRINCIPAL
// Mode plein écran: premier clic active le plein écran
// 🌍 i18n enabled
// ✅ Utilise useGuideProgress pour la logique centralisée

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showContinueBar, setShowContinueBar] = useState(false);
  
  // ✅ État pour savoir si l'utilisateur a fermé le modal manuellement
  const [modalDismissed, setModalDismissed] = useState(false);
  
  // ✅ Hook centralisé pour la progression du guide
  const { isPageAccessible, shouldShowGuide, markGuideCompleted, isGuideComplete, isLoading: isGuideLoading } = useGuideProgress();
  
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
  } = useTooltipTour('dashboard', {
    onComplete: () => setShowContinueBar(true)
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
    closeModal: closeTrialModal 
  } = useTrialReminders();

  // ✅ CALCUL DIRECT: Afficher le modal SEULEMENT si:
  // 1. Guide non encore chargé ou dashboard doit être affiché
  // 2. L'utilisateur n'a pas fermé le modal
  const showWelcome = !isGuideLoading && shouldShowGuide('dashboard') && !modalDismissed;
  
  // Debug logs
  useEffect(() => {
    console.log('[Dashboard] === État actuel ===');
    console.log('[Dashboard] isGuideLoading:', isGuideLoading);
    console.log('[Dashboard] shouldShowGuide(dashboard):', shouldShowGuide('dashboard'));
    console.log('[Dashboard] modalDismissed:', modalDismissed);
    console.log('[Dashboard] showWelcome (calculé):', showWelcome);
  }, [isGuideLoading, modalDismissed, showWelcome, shouldShowGuide]);
  
  // Note: Le hook useTrialReminders gère automatiquement l'affichage du modal trial

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
    return new Date(dateStr).toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { 
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

  // 💳 Prochaines dépenses (sorties du budget)
  const upcomingExpenses = budgetSorties.map((sortie, index) => {
    const getNextDate = (jourRecurrence, frequence) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normaliser à minuit
      const jour = parseInt(jourRecurrence) || 1;
      let nextDate = new Date(today.getFullYear(), today.getMonth(), jour);
      nextDate.setHours(0, 0, 0, 0); // Normaliser à minuit
      
      // Si la date est passée ou aujourd'hui, calculer la prochaine occurrence
      if (nextDate <= today) {
        if (frequence === 'mensuel') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (frequence === 'bimensuel') {
          // Ajouter 14 jours depuis la date originale
          while (nextDate <= today) {
            nextDate.setDate(nextDate.getDate() + 14);
          }
        } else if (frequence === 'hebdomadaire') {
          // Ajouter 7 jours jusqu'à être dans le futur
          while (nextDate <= today) {
            nextDate.setDate(nextDate.getDate() + 7);
          }
        } else {
          // Par défaut, ajouter un mois
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
      }
      
      return nextDate.toISOString().split('T')[0];
    };

    const nextDate = getNextDate(sortie.jourRecurrence, sortie.frequence);
    const amount = parseFloat(sortie.montant) || 0;
    
    let priority = 'low';
    if (amount >= 500) priority = 'high';
    else if (amount >= 100) priority = 'medium';

    return {
      id: sortie.id || index + 1,
      name: sortie.description || t('budget.expenses'),
      amount: amount,
      date: nextDate,
      type: 'expense',
      priority: priority,
      frequence: sortie.frequence
    };
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

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
      <div data-tooltip="calendar">
        <CalendrierO interactive={interactive} />
      </div>

      {/* SECTION 2: TABLEAU DE BORD */}
      <div>
        <h2 style={{ 
          fontSize: '1.8em', 
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
            padding: '6px 10px',
            fontSize: '0.8em'
          }}>📊</span>
          {t('dashboard.title')}
        </h2>

        {/* 3 CARTES */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '20px'
        }}>
          {/* CARTE 1: Alertes */}
          <div
            data-tooltip="alerts"
            onClick={interactive && gpsAccessible ? () => navigate('/gps') : undefined}
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
              borderRadius: '16px',
              padding: '20px',
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
              marginBottom: '15px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ff980020 0%, #ffc10720 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3em'
              }}>
                🔔
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1em', fontWeight: 'bold', color: isDark ? 'white' : '#1e293b' }}>
                  {t('dashboard.alerts.title')}
                </h3>
                <p style={{ margin: 0, fontSize: '0.75em', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>
                  {alerts.length} {alerts.length > 1 ? t('dashboard.alerts.notifications') : t('dashboard.alerts.notification')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alerts.slice(0, 3).map((alert) => {
                const style = getAlertStyle(alert.type);
                return (
                  <div 
                    key={alert.id} 
                    style={{
                      background: style.bg,
                      borderRadius: '10px',
                      padding: '10px 12px',
                      borderLeft: `3px solid ${style.border}`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontSize: '0.9em' }}>{style.icon}</span>
                    <p style={{ fontSize: '0.8em', fontWeight: '500', color: '#2c3e50', margin: 0, lineHeight: '1.3' }}>
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
              borderRadius: '16px',
              padding: '20px',
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
              marginBottom: '15px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ffa50020 0%, #ff6b0020 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3em'
              }}>
                💳
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1em', fontWeight: 'bold', color: isDark ? 'white' : '#1e293b' }}>
                  {t('dashboard.upcoming.title')}
                </h3>
                <p style={{ margin: 0, fontSize: '0.75em', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>
                  {upcomingExpenses.length} {upcomingExpenses.length > 1 ? t('dashboard.upcoming.stopsPlanned') : t('dashboard.upcoming.stopPlanned')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {upcomingExpenses.length > 0 ? upcomingExpenses.slice(0, 3).map((expense) => (
                <div 
                  key={expense.id} 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderRadius: '8px'
                  }}
                >
                  <div>
                    <p style={{ fontWeight: '600', color: isDark ? 'white' : '#1e293b', margin: 0, fontSize: '0.85em' }}>
                      {expense.name}
                    </p>
                    <p style={{ fontSize: '0.7em', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b', margin: '2px 0 0' }}>
                      {formatDate(expense.date)}
                    </p>
                  </div>
                  <p style={{ fontWeight: 'bold', color: '#ffa500', margin: 0, fontSize: '0.9em' }}>
                    -{formatCurrency(expense.amount)}
                  </p>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '15px 0' }}>
                  <p style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', fontSize: '0.85em', marginBottom: '5px' }}>
                    {t('dashboard.upcoming.noStops')}
                  </p>
                  <span style={{ color: '#3498db', fontSize: '0.8em', fontWeight: '600' }}>
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
              borderRadius: '16px',
              padding: '20px',
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
              marginBottom: '15px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #9b59b620 0%, #e91e6320 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3em'
              }}>
                🧭
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1em', fontWeight: 'bold', color: isDark ? 'white' : '#1e293b' }}>
                  {t('dashboard.goals.title')}
                </h3>
                <p style={{ margin: 0, fontSize: '0.75em', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>
                  {activeGoals.length} {activeGoals.length > 1 ? t('dashboard.goals.destinations') : t('dashboard.goals.destination')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeGoals.length > 0 ? activeGoals.slice(0, 3).map((goal) => {
                const goalColor = goal.isCredit ? '#ffa500' : getGoalColor(goal.type);
                return (
                  <div key={goal.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <p style={{ 
                        fontWeight: '600', 
                        color: isDark ? 'white' : '#1e293b', 
                        fontSize: '0.8em', 
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '150px'
                      }}
                        title={goal.nom}
                      >
                        {goal.nom}
                      </p>
                      <p style={{ 
                        fontSize: '0.75em', 
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
                      height: '6px',
                      overflow: 'hidden'
                    }}>
                      <div 
                        style={{ 
                          background: goal.progress >= 100 
                            ? 'linear-gradient(90deg, #27ae60, #2ecc71)' 
                            : `linear-gradient(90deg, ${goalColor}, ${goalColor}dd)`,
                          height: '6px', 
                          borderRadius: '8px',
                          width: `${Math.min(goal.progress, 100)}%`,
                          transition: 'width 0.5s ease-out'
                        }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <div style={{ textAlign: 'center', padding: '15px 0' }}>
                  <p style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', fontSize: '0.85em', marginBottom: '5px' }}>
                    {t('dashboard.goals.noDestinations')}
                  </p>
                  <span style={{ color: '#9b59b6', fontSize: '0.8em', fontWeight: '600' }}>
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
          : isDark ? 'transparent' : '#ffffff',
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
      <div 
        onClick={() => setIsFullScreen(true)}
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          background: isDark ? 'linear-gradient(180deg, #040449 0%, #100261 100%)' : '#ffffff',
          overflow: 'hidden',
          cursor: 'pointer',
          padding: '25px 30px 25px 30px',
          borderTopLeftRadius: '0'
        }}
      >
        {/* Contenu en mode aperçu (non-interactif) */}
        {renderContent(false)}
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
            background: isDark ? 'linear-gradient(180deg, #040449 0%, #100261 100%)' : '#ffffff',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header plein écran */}
          <div style={{ 
            padding: '12px 30px',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'transparent',
            flexShrink: 0
          }}>
            <h1 style={{ 
              fontSize: '1.3em', 
              fontWeight: 'bold', 
              color: isDark ? 'white' : '#1e293b', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              margin: 0 
            }}>
              🏠 {t('nav.home')}
            </h1>
            
            <button
              onClick={() => setIsFullScreen(false)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: isDark ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(0,0,0,0.2)',
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                color: isDark ? 'white' : '#475569',
                fontSize: '1.1em',
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
            padding: '20px 30px',
            background: 'transparent'
          }}>
            {renderContent(true)}
          </div>
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
      <TrialWelcomeModal
        isOpen={showTrialWelcome}
        onClose={closeTrialModal}
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
      />
    </div>
  );
};

export default Dashboard;
