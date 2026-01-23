// 🧭 GPS Navigation - Vue étape par étape (comme un vrai GPS)
// Phase 1: MVP pour lancement
// - Position actuelle (soldes du jour)
// - Prochaine manœuvre (prochaine transaction avec "dans X jours")
// - Destination prioritaire (objectif #1)
// - Métriques en bas (ETA, Distance restante, Vitesse)
// - Bouton "Voir ma trajectoire financière" → GPSFinancier.jsx

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserData } from '../../../context/UserDataContext';
import { useSubscription } from '../../../context/SubscriptionContext';
import useGuideProgress from '../../../hooks/useGuideProgress';
import useAllDayData from '../../../hooks/useAllDayData';
import PageGuideModal from '../../../components/common/PageGuideModal';

// Composant O animé pour le bouton GPS
const AnimatedOButton = ({ size = 45, glow = false, onClick }) => (
  <div 
    onClick={onClick}
    style={{
      position: 'relative',
      width: `${size}px`,
      height: `${size}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: onClick ? 'pointer' : 'default'
    }}
  >
    <div style={{
      position: 'absolute',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      border: '3px solid transparent',
      background: 'linear-gradient(#040449, #100261) padding-box, linear-gradient(180deg, #ffd700, #ff8c00, #ff4500, #ffd700) border-box',
      animation: glow ? 'gps-ring-spin 2s linear infinite, gps-glow 1s ease-in-out infinite' : 'gps-ring-spin 3s linear infinite',
      boxShadow: glow ? '0 0 25px rgba(255, 165, 0, 0.8)' : '0 0 15px rgba(255, 165, 0, 0.5)'
    }} />
  </div>
);

const GPSNavigation = () => {
  const { t, i18n } = useTranslation();
  const { userData, isLoading } = useUserData();
  const { currentPlan } = useSubscription();
  const navigate = useNavigate();
  
  // Hook centralisé pour la progression du guide
  const { shouldShowGuide, markGuideCompleted, isLoading: isGuideLoading } = useGuideProgress();
  
  // États
  const [showGuide, setShowGuide] = useState(false);
  const [showContinueBar, setShowContinueBar] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Activer le mode plein écran au premier clic (comme les autres pages)
  const handleFirstClick = () => {
    if (!isFullScreen) {
      setIsFullScreen(true);
    }
  };
  
  // État pour masquer/afficher les soldes
  const [balancesHidden, setBalancesHidden] = useState(() => {
    const saved = localStorage.getItem('pl4to_security_settings');
    return saved ? JSON.parse(saved).hideBalances : false;
  });
  
  // Vérifier si le guide doit être affiché
  useEffect(() => {
    if (!isGuideLoading && shouldShowGuide('gps')) {
      setShowGuide(true);
    }
  }, [shouldShowGuide, isGuideLoading]);
  
  // Fermer le modal et afficher la barre "On continue"
  const closeModal = () => {
    setShowGuide(false);
    setShowContinueBar(true);
  };
  
  // Marquer comme complété et passer à la page suivante
  const continueToNextPage = () => {
    setShowContinueBar(false);
    markGuideCompleted('gps');
    setTimeout(() => {
      navigate('/simulations');
    }, 100);
  };
  
  // Toggle pour afficher/masquer les soldes
  const toggleBalances = (e) => {
    e.stopPropagation();
    setBalancesHidden(!balancesHidden);
  };
  
  // Écouter les changements de paramètres de sécurité
  useEffect(() => {
    const handleSecurityChange = (e) => {
      setBalancesHidden(e.detail.hideBalances);
    };
    window.addEventListener('securitySettingsChanged', handleSecurityChange);
    return () => window.removeEventListener('securitySettingsChanged', handleSecurityChange);
  }, []);
  
  // ============================================
  // DONNÉES
  // ============================================
  const accounts = userData?.accounts || [];
  const soldes = userData?.initialBalances?.soldes || [];
  const goals = userData?.objectifs || [];
  const budgetEntrees = userData?.budgetPlanning?.entrees || userData?.budgetEntrees || [];
  const budgetSorties = userData?.budgetPlanning?.sorties || userData?.budgetSorties || [];
  
  // Calcul de allDayData avec le hook partagé
  const allDayData = useAllDayData({
    accounts,
    initialBalances: soldes,
    budgetEntrees,
    budgetSorties,
    budgetModifications: userData?.budgetPlanning?.modifications || [],
    daysToLoad: 365
  });
  
  // Date d'aujourd'hui
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  // ============================================
  // POSITION ACTUELLE (Soldes d'aujourd'hui)
  // ============================================
  const currentPosition = useMemo(() => {
    const todayData = allDayData.find(d => d.isToday) || allDayData[0];
    if (!todayData) return { accounts: {}, date: todayStr };
    return {
      accounts: todayData.accounts || {},
      date: todayData.dateStr || todayStr,
      label: todayData.label || "Aujourd'hui"
    };
  }, [allDayData, todayStr]);
  
  // ============================================
  // PROCHAINES MANŒUVRES (Transactions à venir)
  // GPS: "Dans 500m, tournez à droite" → "Dans 5 jours, reçois 2 123$"
  // ============================================
  const upcomingTransactions = useMemo(() => {
    const transactions = [];
    
    // Parcourir les jours à venir pour trouver les transactions
    for (let i = 0; i < allDayData.length && transactions.length < 10; i++) {
      const dayData = allDayData[i];
      if (!dayData || dayData.isToday) continue;
      
      const dayDate = new Date(dayData.dateStr);
      const daysUntil = Math.ceil((dayDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntil <= 0) continue;
      
      // Collecter les entrées et sorties de ce jour
      if (dayData.entrees && dayData.entrees.length > 0) {
        dayData.entrees.forEach(e => {
          transactions.push({
            type: 'entree',
            description: e.description,
            montant: e.montant,
            compte: e.compte,
            dateStr: dayData.dateStr,
            label: dayData.label,
            daysUntil
          });
        });
      }
      
      if (dayData.sorties && dayData.sorties.length > 0) {
        dayData.sorties.forEach(s => {
          if (s.type !== 'transfert') {
            transactions.push({
              type: 'sortie',
              description: s.description,
              montant: s.montant,
              compte: s.compte,
              dateStr: dayData.dateStr,
              label: dayData.label,
              daysUntil
            });
          }
        });
      }
    }
    
    return transactions.slice(0, 10);
  }, [allDayData, today]);
  
  // Prochaine manœuvre (groupe de transactions du prochain jour avec activité)
  const nextManeuver = useMemo(() => {
    if (upcomingTransactions.length === 0) return null;
    
    const firstTransaction = upcomingTransactions[0];
    const sameDay = upcomingTransactions.filter(t => t.dateStr === firstTransaction.dateStr);
    
    return {
      dateStr: firstTransaction.dateStr,
      label: firstTransaction.label,
      daysUntil: firstTransaction.daysUntil,
      transactions: sameDay
    };
  }, [upcomingTransactions]);
  
  // Transactions après la prochaine manœuvre
  const followingTransactions = useMemo(() => {
    if (!nextManeuver) return [];
    return upcomingTransactions
      .filter(t => t.dateStr !== nextManeuver.dateStr)
      .slice(0, 3);
  }, [upcomingTransactions, nextManeuver]);
  
  // ============================================
  // DESTINATION PRIORITAIRE (Objectif #1)
  // GPS: "Arrivée: 3:31 | 39 min | 45 km" → "Arrivée: Mars 2031 | 21 mois | 8 364$"
  // ============================================
  const primaryDestination = useMemo(() => {
    if (!goals || goals.length === 0) return null;
    
    // Trier par priorité (haute > moyenne > basse)
    const priorityOrder = { haute: 1, high: 1, moyenne: 2, medium: 2, basse: 3, low: 3 };
    const sortedGoals = [...goals].sort((a, b) => {
      const priorityA = priorityOrder[a.priority?.toLowerCase()] || 2;
      const priorityB = priorityOrder[b.priority?.toLowerCase()] || 2;
      return priorityA - priorityB;
    });
    
    const goal = sortedGoals[0];
    if (!goal) return null;
    
    // Trouver le compte associé
    const linkedAccount = accounts.find(a => a.nom === goal.linkedAccount);
    const soldeInfo = soldes.find(s => s.accountName === goal.linkedAccount);
    const currentAmount = parseFloat(soldeInfo?.solde) || 0;
    const targetAmount = parseFloat(goal.targetAmount) || 0;
    
    // Calculer la progression
    const isDebt = linkedAccount?.type === 'credit' || linkedAccount?.type === 'hypotheque';
    let progression = 0;
    let remaining = 0;
    
    if (isDebt) {
      // Pour les dettes: on veut que le solde diminue vers la cible (généralement 0)
      const initialDebt = parseFloat(linkedAccount?.limite) || currentAmount;
      const paid = initialDebt - currentAmount;
      const toPay = initialDebt - targetAmount;
      progression = toPay > 0 ? Math.min(100, (paid / toPay) * 100) : 100;
      remaining = Math.max(0, currentAmount - targetAmount);
    } else {
      // Pour l'épargne: on veut que le solde augmente vers la cible
      progression = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;
      remaining = Math.max(0, targetAmount - currentAmount);
    }
    
    // Calculer la vitesse (rythme mensuel d'épargne/remboursement)
    let monthlyRate = 0;
    if (isDebt) {
      // Somme des paiements mensuels vers ce compte
      budgetSorties.forEach(s => {
        if (s.compte === goal.linkedAccount || s.compteDestination === goal.linkedAccount) {
          const freq = s.frequence?.toLowerCase();
          const montant = parseFloat(s.montant) || 0;
          if (freq === 'mensuel') monthlyRate += montant;
          else if (freq === 'hebdomadaire') monthlyRate += montant * 4.33;
          else if (freq === 'bimensuel' || freq === 'quinzaine') monthlyRate += montant * 2.17;
        }
      });
    } else {
      // Somme des entrées mensuelles vers ce compte (ou transferts)
      budgetEntrees.forEach(e => {
        if (e.compte === goal.linkedAccount) {
          const freq = e.frequence?.toLowerCase();
          const montant = parseFloat(e.montant) || 0;
          if (freq === 'mensuel') monthlyRate += montant;
          else if (freq === 'hebdomadaire') monthlyRate += montant * 4.33;
          else if (freq === 'bimensuel' || freq === 'quinzaine') monthlyRate += montant * 2.17;
        }
      });
      // Ajouter les transferts vers ce compte
      budgetSorties.forEach(s => {
        if (s.type === 'transfert' && s.compteDestination === goal.linkedAccount) {
          const freq = s.frequence?.toLowerCase();
          const montant = parseFloat(s.montant) || 0;
          if (freq === 'mensuel') monthlyRate += montant;
          else if (freq === 'hebdomadaire') monthlyRate += montant * 4.33;
          else if (freq === 'bimensuel' || freq === 'quinzaine') monthlyRate += montant * 2.17;
        }
      });
    }
    
    // Calculer ETA (mois restants)
    const monthsRemaining = monthlyRate > 0 ? Math.ceil(remaining / monthlyRate) : null;
    const etaDate = monthsRemaining ? new Date(today.getTime() + monthsRemaining * 30 * 24 * 60 * 60 * 1000) : null;
    
    return {
      ...goal,
      currentAmount,
      targetAmount,
      progression: Math.round(progression),
      remaining,
      monthlyRate,
      monthsRemaining,
      etaDate,
      isDebt,
      linkedAccount: goal.linkedAccount
    };
  }, [goals, accounts, soldes, budgetEntrees, budgetSorties, today]);
  
  // Autres destinations (objectifs suivants)
  const otherDestinations = useMemo(() => {
    if (!goals || goals.length <= 1) return [];
    
    const priorityOrder = { haute: 1, high: 1, moyenne: 2, medium: 2, basse: 3, low: 3 };
    return [...goals]
      .sort((a, b) => {
        const priorityA = priorityOrder[a.priority?.toLowerCase()] || 2;
        const priorityB = priorityOrder[b.priority?.toLowerCase()] || 2;
        return priorityA - priorityB;
      })
      .slice(1, 4); // Prochains 3 objectifs
  }, [goals]);
  
  // ============================================
  // MÉTRIQUES GLOBALES (Carburant = Balance mensuelle)
  // ============================================
  const globalMetrics = useMemo(() => {
    let totalMonthlyEntrees = 0;
    let totalMonthlySorties = 0;
    
    budgetEntrees.forEach(e => {
      const freq = e.frequence?.toLowerCase();
      const montant = parseFloat(e.montant) || 0;
      if (freq === 'mensuel') totalMonthlyEntrees += montant;
      else if (freq === 'hebdomadaire') totalMonthlyEntrees += montant * 4.33;
      else if (freq === 'bimensuel' || freq === 'quinzaine') totalMonthlyEntrees += montant * 2.17;
    });
    
    budgetSorties.forEach(s => {
      const freq = s.frequence?.toLowerCase();
      const montant = parseFloat(s.montant) || 0;
      if (freq === 'mensuel') totalMonthlySorties += montant;
      else if (freq === 'hebdomadaire') totalMonthlySorties += montant * 4.33;
      else if (freq === 'bimensuel' || freq === 'quinzaine') totalMonthlySorties += montant * 2.17;
    });
    
    const monthlyBalance = totalMonthlyEntrees - totalMonthlySorties;
    
    return {
      monthlyEntrees: totalMonthlyEntrees,
      monthlySorties: totalMonthlySorties,
      monthlyBalance,
      isPositive: monthlyBalance >= 0
    };
  }, [budgetEntrees, budgetSorties]);
  
  // ============================================
  // ALERTES
  // ============================================
  const alerts = useMemo(() => {
    const alertList = [];
    
    // Vérifier les découverts prévus dans les 30 prochains jours
    for (let i = 0; i < Math.min(30, allDayData.length); i++) {
      const dayData = allDayData[i];
      if (!dayData) continue;
      
      Object.entries(dayData.accounts || {}).forEach(([accountName, accountData]) => {
        const account = accounts.find(a => a.nom === accountName);
        const solde = accountData.solde || 0;
        
        if (account?.type === 'credit') {
          // Pour crédit: alerte si dépasse la limite
          const limite = parseFloat(account.limite) || 0;
          if (solde > limite && limite > 0) {
            if (!alertList.find(a => a.type === 'limitExceeded' && a.account === accountName)) {
              alertList.push({
                type: 'limitExceeded',
                account: accountName,
                dateStr: dayData.dateStr,
                label: dayData.label,
                amount: solde - limite
              });
            }
          }
        } else {
          // Pour autres comptes: alerte si négatif
          if (solde < 0) {
            if (!alertList.find(a => a.type === 'overdraft' && a.account === accountName)) {
              alertList.push({
                type: 'overdraft',
                account: accountName,
                dateStr: dayData.dateStr,
                label: dayData.label,
                amount: Math.abs(solde)
              });
            }
          }
        }
      });
    }
    
    return alertList;
  }, [allDayData, accounts]);
  
  // ============================================
  // FORMATAGE
  // ============================================
  const formatMontant = (montant) => {
    if (balancesHidden) return '••••••';
    return new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2
    }).format(montant);
  };
  
  const formatDaysUntil = (days) => {
    if (days === 0) return t('common.today') || "Aujourd'hui";
    if (days === 1) return t('common.tomorrow') || 'Demain';
    return `Dans ${days} jours`;
  };
  
  // ============================================
  // SI PAS DE DONNÉES - CHARGEMENT
  // ============================================
  if (isLoading) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <AnimatedOButton size={60} glow />
          <p style={{ marginTop: '20px', opacity: 0.8 }}>{t('gps.loading') || 'Calcul de la trajectoire...'}</p>
        </div>
      </div>
    );
  }
  
  // ============================================
  // SI PAS DE COMPTES CONFIGURÉS
  // ============================================
  if (!userData || accounts.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
        color: 'white',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <AnimatedOButton size={80} />
        <h2>{t('gps.welcome.title') || 'Bienvenue dans ton GPS Financier'}</h2>
        <p style={{ opacity: 0.8, maxWidth: '400px', textAlign: 'center' }}>
          {t('gps.welcome.message') || 'Configure ton budget pour commencer la navigation'}
        </p>
        <button
          onClick={() => navigate('/budget')}
          style={{
            padding: '15px 30px',
            background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
            border: 'none',
            borderRadius: '25px',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          {t('gps.welcome.cta') || 'Configurer mon budget'}
        </button>
      </div>
    );
  }

  // ============================================
  // RENDU PRINCIPAL - MODE NORMAL OU PLEIN ÉCRAN
  // ============================================
  
  // Contenu principal (partagé entre mode normal et plein écran)
  const renderContent = () => (
    <>
      {/* ALERTES (si présentes) */}
      {alerts.length > 0 && (
        <div style={{
          background: 'rgba(255, 82, 82, 0.15)',
          border: '1px solid rgba(255, 82, 82, 0.3)',
          borderRadius: '15px',
          padding: '15px 20px',
          marginBottom: '20px',
          animation: 'slide-in 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ff5252' }}>
            <span style={{ fontSize: '1.3em' }}>⚠️</span>
            <span style={{ fontWeight: 'bold' }}>
              {alerts.length} alerte{alerts.length > 1 ? 's' : ''} détectée{alerts.length > 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ marginTop: '10px' }}>
            {alerts.slice(0, 2).map((alert, idx) => (
              <div key={idx} style={{ 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '0.9em',
                marginTop: idx > 0 ? '5px' : 0
              }}>
                {alert.type === 'overdraft' 
                  ? `📍 Découvert de ${formatMontant(alert.amount)} prévu sur ${alert.account} (${alert.label})`
                  : `📍 Limite dépassée de ${formatMontant(alert.amount)} sur ${alert.account} (${alert.label})`
                }
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* POSITION ACTUELLE */}
      <div className="nav-card" style={{ marginBottom: '20px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          marginBottom: '15px',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.85em',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          <span style={{ 
            width: '12px', 
            height: '12px', 
            background: '#4CAF50', 
            borderRadius: '50%',
            animation: 'pulse-dot 2s infinite'
          }} />
          📍 {t('gps.navigation.currentPositionTitle')}
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          {accounts.map(account => {
            const accountData = currentPosition.accounts[account.nom];
            const solde = accountData?.solde || 0;
            const isCredit = account.type === 'credit' || account.type === 'hypotheque';
            
            return (
              <div key={account.nom} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '15px',
                borderLeft: `3px solid ${isCredit ? '#ff9800' : '#4CAF50'}`
              }}>
                <div style={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontSize: '0.85em',
                  marginBottom: '5px'
                }}>
                  {account.type === 'cheque' ? '💳' : account.type === 'epargne' ? '🌱' : '🏦'} {account.nom}
                </div>
                <div style={{ 
                  color: isCredit ? '#ff9800' : '#4CAF50',
                  fontSize: '1.4em',
                  fontWeight: 'bold'
                }}>
                  {formatMontant(solde)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* PROCHAINE MANŒUVRE */}
      <div className="nav-card" style={{ marginBottom: '20px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <div style={{ 
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.85em',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            ➡️ {t('gps.navigation.nextManeuverTitle')}
          </div>
          {nextManeuver && (
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '8px 16px',
              borderRadius: '20px',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.9em'
            }}>
              {formatDaysUntil(nextManeuver.daysUntil)}
            </div>
          )}
        </div>
        
        {nextManeuver ? (
          <>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '15px',
              padding: '20px',
              border: '1px solid rgba(255,165,0,0.2)'
            }}>
              <div style={{ 
                color: 'white', 
                fontSize: '1.1em', 
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                📅 {nextManeuver.label}
              </div>
              
              {nextManeuver.transactions.map((trans, idx) => (
                <div 
                  key={idx}
                  className={`transaction-row ${trans.type}`}
                >
                  <span style={{ fontSize: '1.2em' }}>
                    {trans.type === 'entree' ? '↗️' : '↘️'}
                  </span>
                  <span style={{ flex: 1, color: 'white' }}>
                    {trans.description}
                  </span>
                  <span style={{ 
                    color: trans.type === 'entree' ? '#4CAF50' : '#ff9800',
                    fontWeight: 'bold'
                  }}>
                    {trans.type === 'entree' ? '+' : '-'}{formatMontant(trans.montant)}
                  </span>
                  <span style={{ 
                    color: 'rgba(255,255,255,0.5)', 
                    fontSize: '0.8em' 
                  }}>
                    → {trans.compte}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Transactions suivantes */}
            {followingTransactions.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <div style={{ 
                  color: 'rgba(255,255,255,0.5)', 
                  fontSize: '0.85em',
                  marginBottom: '10px'
                }}>
                  → Puis:
                </div>
                {followingTransactions.map((trans, idx) => (
                  <div key={idx} style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '0.9em',
                    marginBottom: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>{trans.daysUntil} jours</span>
                    <span>-</span>
                    <span>{trans.description}</span>
                    <span style={{ color: trans.type === 'entree' ? '#4CAF50' : '#ff9800' }}>
                      {trans.type === 'entree' ? '+' : '-'}{formatMontant(trans.montant)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* AUCUNE TRANSACTION À VENIR */
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '15px',
            padding: '30px 20px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontSize: '2.5em', marginBottom: '15px' }}>🛣️</div>
            <div style={{ 
              color: 'white', 
              fontSize: '1.1em', 
              fontWeight: '600',
              marginBottom: '10px'
            }}>
              Aucune transaction à venir
            </div>
            <div style={{ 
              color: 'rgba(255,255,255,0.6)', 
              fontSize: '0.9em',
              marginBottom: '20px'
            }}>
              Configure ton budget pour voir tes prochaines manœuvres financières
            </div>
            <button
              onClick={() => navigate('/budget')}
              style={{
                padding: '12px 25px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '25px',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.95em'
              }}
            >
              📊 Configurer mon budget
            </button>
          </div>
        )}
      </div>
      
      {/* DESTINATION PRIORITAIRE */}
      {primaryDestination ? (
        <div className="nav-card" style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            marginBottom: '15px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.85em',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            🎯 {t('gps.navigation.primaryDestinationTitle')}
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
            borderRadius: '15px',
            padding: '20px',
            border: '1px solid rgba(102, 126, 234, 0.3)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '15px'
            }}>
              <div>
                <h3 style={{ color: 'white', margin: 0, fontSize: '1.2em' }}>
                  {primaryDestination.isDebt ? '💳' : '🌱'} {primaryDestination.name}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: '5px 0 0', fontSize: '0.9em' }}>
                  {t('gps.navigation.account')}: {primaryDestination.linkedAccount}
                </p>
              </div>
              <div style={{
                background: primaryDestination.progression >= 100 ? '#4CAF50' : 'rgba(255,165,0,0.3)',
                padding: '8px 16px',
                borderRadius: '20px',
                color: 'white',
                fontWeight: 'bold'
              }}>
                {primaryDestination.progression >= 100 ? `🎉 ${t('gps.navigation.achievedBadge')}` : `${primaryDestination.progression}%`}
              </div>
            </div>
            
            {/* Barre de progression */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '10px',
              height: '12px',
              overflow: 'hidden',
              marginBottom: '15px'
            }}>
              <div style={{
                width: `${Math.min(100, primaryDestination.progression)}%`,
                height: '100%',
                background: primaryDestination.progression >= 100 
                  ? 'linear-gradient(90deg, #4CAF50, #8BC34A)'
                  : 'linear-gradient(90deg, #ff9800, #ffc107)',
                borderRadius: '10px',
                transition: 'width 1s ease'
              }} />
            </div>
            
            {/* Métriques */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '15px',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8em', marginBottom: '5px' }}>
                  📏 Reste
                </div>
                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1em' }}>
                  {formatMontant(primaryDestination.remaining)}
                </div>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8em', marginBottom: '5px' }}>
                  🚗 {t('gps.navigation.speedLabel')}
                </div>
                <div style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: '1.1em' }}>
                  +{formatMontant(primaryDestination.monthlyRate)}/mois
                </div>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8em', marginBottom: '5px' }}>
                  ⏱️ Arrivée
                </div>
                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1em' }}>
                  {primaryDestination.monthsRemaining 
                    ? `~${primaryDestination.monthsRemaining} mois`
                    : 'À configurer'
                  }
                </div>
              </div>
            </div>
          </div>
          
          {/* Autres destinations */}
          {otherDestinations.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <div style={{ 
                color: 'rgba(255,255,255,0.5)', 
                fontSize: '0.85em',
                marginBottom: '10px'
              }}>
                🛣️ Arrêts suivants:
              </div>
              {otherDestinations.map((dest, idx) => (
                <div key={idx} style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.9em',
                  marginBottom: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>•</span>
                  <span>{dest.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                    ({formatMontant(dest.targetAmount)})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* AUCUNE DESTINATION */
        <div className="nav-card" style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            marginBottom: '15px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.85em',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            🎯 Destination
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '15px',
            padding: '30px 20px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontSize: '2.5em', marginBottom: '15px' }}>🎯</div>
            <div style={{ 
              color: 'white', 
              fontSize: '1.1em', 
              fontWeight: '600',
              marginBottom: '10px'
            }}>
              Aucune destination définie
            </div>
            <div style={{ 
              color: 'rgba(255,255,255,0.6)', 
              fontSize: '0.9em',
              marginBottom: '20px'
            }}>
              Définis un objectif pour savoir où tu vas!
            </div>
            <button
              onClick={() => navigate('/objectifs')}
              style={{
                padding: '12px 25px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '25px',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.95em'
              }}
            >
              🎯 Définir un objectif
            </button>
          </div>
        </div>
      )}
    </>
  );

  // ============================================
  // RENDU - MODE PLEIN ÉCRAN
  // ============================================
  if (isFullScreen) {
    return (
      <>
        {/* Styles CSS */}
        <style>
          {`
            @keyframes gps-ring-spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            @keyframes gps-glow {
              0%, 100% { box-shadow: 0 0 15px rgba(255, 165, 0, 0.5); }
              50% { box-shadow: 0 0 30px rgba(255, 165, 0, 0.8); }
            }
            
            @keyframes pulse-dot {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.8; }
            }
            
            @keyframes slide-in {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            
            .nav-card {
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 20px;
              padding: 20px;
              backdrop-filter: blur(10px);
              transition: all 0.3s ease;
            }
            
            .nav-card:hover {
              background: rgba(255, 255, 255, 0.08);
              border-color: rgba(255, 165, 0, 0.3);
            }
            
            .transaction-row {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 10px 15px;
              background: rgba(255, 255, 255, 0.03);
              border-radius: 12px;
              margin-bottom: 8px;
            }
            
            .transaction-row.entree {
              border-left: 3px solid #4CAF50;
            }
            
            .transaction-row.sortie {
              border-left: 3px solid #ff9800;
            }
          `}
        </style>
        
        {/* WRAPPER PLEIN ÉCRAN */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          overflow: 'hidden'
        }}>
          
          {/* HEADER */}
          <div style={{
            padding: '20px 30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <AnimatedOButton size={50} glow={alerts.length > 0} />
              <h1 style={{ 
                color: 'white', 
                fontSize: '1.4em', 
                margin: 0
              }}>
                🧭 GPS Financier
              </h1>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Bouton voir trajectoire complète */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/gps/itineraire');
                }}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '20px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.9em',
                  fontWeight: '600'
                }}
              >
                🛣️ Voir ma trajectoire financière
              </button>
              
              {/* Bouton fermer plein écran */}
              <button
                onClick={() => setIsFullScreen(false)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1.2em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* CONTENU PRINCIPAL - SCROLLABLE */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '20px 30px 30px'
          }}>
            {renderContent()}
          </div>
          
          {/* BARRE DE MÉTRIQUES EN BAS */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '15px 30px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75em', marginBottom: '5px' }}>
                ⏱️ ARRIVÉE
              </div>
              <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1em' }}>
                {primaryDestination?.etaDate 
                  ? primaryDestination.etaDate.toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { month: 'short', year: 'numeric' })
                  : '—'
                }
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75em', marginBottom: '5px' }}>
                📏 DISTANCE
              </div>
              <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1em' }}>
                {primaryDestination?.remaining 
                  ? formatMontant(primaryDestination.remaining)
                  : '—'
                }
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75em', marginBottom: '5px' }}>
                ⛽ CARBURANT
              </div>
              <div style={{ 
                color: globalMetrics.isPositive ? '#4CAF50' : '#ff5252', 
                fontWeight: 'bold', 
                fontSize: '1.1em' 
              }}>
                {globalMetrics.isPositive ? '+' : ''}{formatMontant(globalMetrics.monthlyBalance)}/mois
              </div>
            </div>
          </div>
        </div>
        
        {/* MODAL GUIDE */}
        <PageGuideModal
          isOpen={showGuide}
          onClose={closeModal}
          icon="🧭"
          titleKey="gps.guideModal.title"
          messageKey="gps.guideModal.message"
          hintIcon="👆"
          hintKey="gps.guideModal.hint"
        />
      </>
    );
  }

  // ============================================
  // RENDU - MODE NORMAL (dans MainLayout)
  // ============================================
  return (
    <>
      {/* Styles CSS */}
      <style>
        {`
          @keyframes gps-ring-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes gps-glow {
            0%, 100% { box-shadow: 0 0 15px rgba(255, 165, 0, 0.5); }
            50% { box-shadow: 0 0 30px rgba(255, 165, 0, 0.8); }
          }
          
          @keyframes pulse-dot {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
          }
          
          @keyframes slide-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .nav-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 20px;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
          }
          
          .nav-card:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 165, 0, 0.3);
          }
          
          .transaction-row {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 15px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 12px;
            margin-bottom: 8px;
          }
          
          .transaction-row.entree {
            border-left: 3px solid #4CAF50;
          }
          
          .transaction-row.sortie {
            border-left: 3px solid #ff9800;
          }
        `}
      </style>
      
      {/* WRAPPER PRINCIPAL - Clic pour activer plein écran */}
      <div 
        onClick={handleFirstClick}
        style={{
          height: '100%',
          background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          cursor: 'pointer'
        }}
      >
        
        {/* HEADER */}
        <div style={{
          padding: '20px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <AnimatedOButton size={50} glow={alerts.length > 0} />
            <h1 style={{ 
              color: 'white', 
              fontSize: '1.4em', 
              margin: 0
            }}>
              🧭 GPS Financier
            </h1>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Bouton voir trajectoire complète */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/gps/itineraire');
              }}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '20px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9em',
                fontWeight: '600'
              }}
            >
              🛣️ Voir ma trajectoire financière
            </button>
            
            {/* Bouton œil */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleBalances(e);
              }}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: balancesHidden ? 'rgba(255,165,0,0.3)' : 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1.2em'
              }}
            >
              {balancesHidden ? '👁️‍🗨️' : '👁️'}
            </button>
          </div>
        </div>
        
        {/* CONTENU PRINCIPAL - SCROLLABLE */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '0 30px 30px'
        }}>
          {renderContent()}
        </div>
        
        {/* BARRE DE MÉTRIQUES EN BAS */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '15px 30px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75em', marginBottom: '5px' }}>
              ⏱️ ARRIVÉE
            </div>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1em' }}>
              {primaryDestination?.etaDate 
                ? primaryDestination.etaDate.toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { month: 'short', year: 'numeric' })
                : '—'
              }
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75em', marginBottom: '5px' }}>
              📏 DISTANCE
            </div>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1em' }}>
              {primaryDestination?.remaining 
                ? formatMontant(primaryDestination.remaining)
                : '—'
              }
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75em', marginBottom: '5px' }}>
              ⛽ CARBURANT
            </div>
            <div style={{ 
              color: globalMetrics.isPositive ? '#4CAF50' : '#ff5252', 
              fontWeight: 'bold', 
              fontSize: '1.1em' 
            }}>
              {globalMetrics.isPositive ? '+' : ''}{formatMontant(globalMetrics.monthlyBalance)}/mois
            </div>
          </div>
        </div>
      </div>
      
      {/* MODAL GUIDE */}
      <PageGuideModal
        isOpen={showGuide}
        onClose={closeModal}
        icon="🧭"
        titleKey="gps.guideModal.title"
        messageKey="gps.guideModal.message"
        hintIcon="👆"
        hintKey="gps.guideModal.hint"
      />
    </>
  );
};

export default GPSNavigation;
