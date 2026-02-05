// 🧭 MES DESTINATIONS - Page de suivi des objectifs financiers (vocabulaire GPS)
// v2: Mode plein écran + popup détails + modal suppression amélioré
// 🌍 i18n enabled
// ✅ Utilise useGuideProgress pour la logique centralisée
// 🎨 Theme support

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import NumpadModal from '../../components/common/NumpadModal';
import DatePickerModal from '../../components/common/DatePickerModal';
import AccountPickerModal from '../../components/common/AccountPickerModal';

// 💡 Suggestions d'objectifs populaires
const GOAL_SUGGESTIONS = [
  { icon: '🛡️', key: 'emergencyFund', type: 'urgence', popular: true },
  { icon: '✈️', key: 'vacation', type: 'voyage', popular: true },
  { icon: '🏠', key: 'downPayment', type: 'epargne', popular: true },
  { icon: '🚗', key: 'newCar', type: 'achat', popular: true },
  { icon: '💳', key: 'payOffDebt', type: 'dette', popular: true },
  { icon: '🎓', key: 'education', type: 'investissement', popular: false },
  { icon: '👶', key: 'babyFund', type: 'epargne', popular: false },
  { icon: '💻', key: 'electronics', type: 'achat', popular: false },
  { icon: '🎸', key: 'hobby', type: 'autre', popular: false },
  { icon: '💍', key: 'wedding', type: 'epargne', popular: false },
  { icon: '🏥', key: 'medical', type: 'urgence', popular: false },
  { icon: '🎉', key: 'specialEvent', type: 'autre', popular: false }
];

const Objectifs = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { userData, saveUserData, isLoading } = useUserData();
  const { canAddMore, limits } = useSubscription();
  const { theme, isDark } = useTheme();
  
  // ✅ Hook centralisé pour la progression du guide
  const { shouldShowGuide, markGuideCompleted, isGuideComplete, isLoading: isGuideLoading } = useGuideProgress();
  
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
  } = useTooltipTour('objectifs', {
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
    window.startObjectifsTour = () => {
      resetTooltips();
      setTimeout(() => startTooltipTour(), 100);
    };
    return () => delete window.startObjectifsTour;
  }, [startTooltipTour, resetTooltips]);
  
  // État pour le guide utilisateur
  const [showGuide, setShowGuide] = useState(false);
  const [showContinueBar, setShowContinueBar] = useState(false);
  
  // Vérifier si le guide doit être affiché
  useEffect(() => {
    if (!isGuideLoading && shouldShowGuide('objectifs')) {
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
    markGuideCompleted('objectifs');
    setTimeout(() => {
      navigate('/gps');
    }, 100);
  };
  
  const [editingGoal, setEditingGoal] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(null); // Pour le popup détails
  const [showAddForm, setShowAddForm] = useState(false);
  // 📱 Détection mobile et PWA
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isPWA, setIsPWA] = useState(window.matchMedia('(display-mode: standalone)').matches);
  
  // 📱 Mobile: démarrer directement en plein écran | Desktop: mode aperçu
  const [isFullScreen, setIsFullScreen] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsFullScreen(mobile);
    };
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handlePWAChange = (e) => setIsPWA(e.matches);
    mediaQuery.addEventListener('change', handlePWAChange);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      mediaQuery.removeEventListener('change', handlePWAChange);
    };
  }, []);
  const [deletingGoal, setDeletingGoal] = useState(null); // Pour le modal de suppression
  const [upgradeModal, setUpgradeModal] = useState({ isOpen: false, type: null }); // Pour les restrictions abonnement
  
  // 🆕 États pour les nouveaux modals
  const [showNumpadModal, setShowNumpadModal] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [showAccountPickerModal, setShowAccountPickerModal] = useState(false);
  
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
    nom: '',
    type: 'epargne',
    montantCible: '',
    dateEcheance: '',
    priorite: 'moyenne', 
    compteAssocie: '',
    notes: ''
  });

  // Formater le montant (locale-aware)
  const formatMontant = (montant) => {
    if (balancesHidden) return '••••••';
    return new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0
    }).format(montant);
  };

  // 🆕 Ajustement dynamique de la taille de police selon le montant (comme Comptes/Simulations)
  const getAmountFontSize = (montant, isSecondary = false) => {
    const absValue = Math.abs(montant);
    const digitCount = Math.floor(absValue).toString().length;
    
    // Taille de base: 1.3em pour principal, 0.9em pour secondaire
    const baseSize = isSecondary ? 0.9 : 1.3;
    
    let multiplier = 1;
    if (digitCount <= 3) {
      multiplier = 1;
    } else if (digitCount === 4) {
      multiplier = 0.92;
    } else if (digitCount === 5) {
      multiplier = 0.85;
    } else if (digitCount === 6) {
      multiplier = 0.77;
    } else {
      multiplier = 0.7;
    }
    
    return baseSize * multiplier;
  };

  // Obtenir l'icône selon le type d'objectif
  const getObjectifIcon = (type) => {
    const icons = {
      'epargne': '🌱',
      'dette': '💳',
      'investissement': '📈',
      'urgence': '🛡️',
      'achat': '🛒',
      'voyage': '✈️',
      'autre': '🧭'
    };
    return icons[type] || '🧭';
  };

  // Obtenir l'icône selon le type de COMPTE (comme page Comptes)
  const getCompteIcon = (compteAssocie) => {
    if (!compteAssocie || !userData.accounts) return '🧭';
    const account = userData.accounts.find(a => a.nom === compteAssocie);
    if (!account) return '🧭';
    
    const icons = {
      'cheque': '💳',
      'epargne': '🌱',
      'credit': '🏦',
      'investissement': '📈'
    };
    return icons[account.type] || '🧭';
  };

  // Obtenir la couleur selon la priorité
  const getPriorityColor = (priority) => {
    const colors = {
      'haute': { bg: '#e3f2fd', border: '#3498db', text: '#2980b9' },    // Bleu
      'moyenne': { bg: '#d1fae5', border: '#27ae60', text: '#1e8449' },  // Vert
      'basse': { bg: '#fef3c7', border: '#f39c12', text: '#d68910' }     // Orange
    };
    return colors[priority] || colors['moyenne'];
  };

  // Vérifier si le compte associé est un compte crédit
  const isCompteCredit = (compteAssocie) => {
    if (!compteAssocie || !userData.accounts) return false;
    const account = userData.accounts.find(a => a.nom === compteAssocie);
    if (account?.type === 'credit') return true;
    
    const soldeInfo = userData.initialBalances?.soldes?.find(s => s.accountName === compteAssocie);
    return soldeInfo?.accountType === 'credit';
  };

  // Calculer la progression réelle basée sur le compte associé
  const calculateRealProgress = (goal) => {
    if (!goal.compteAssocie) return { progress: 0, currentAmount: 0, isCredit: false };
    
    const accountBalance = userData.initialBalances?.soldes?.find(
      s => s.accountName === goal.compteAssocie
    );
    const currentBalance = accountBalance ? parseFloat(accountBalance.solde) || 0 : 0;
    const targetAmount = parseFloat(goal.montantCible) || 0;
    
    const isCredit = isCompteCredit(goal.compteAssocie);
    const accountInfo = userData.accounts?.find(a => a.nom === goal.compteAssocie);
    const limite = parseFloat(accountInfo?.limite) || 0;
    
    if (targetAmount === 0) return { progress: 0, currentAmount: currentBalance, isCredit, limite };
    
    let progress;
    
    if (isCredit) {
      if (currentBalance <= targetAmount) {
        progress = 100;
      } else if (limite > 0 && limite >= currentBalance) {
        const totalToRepay = limite - targetAmount;
        const alreadyRepaid = limite - currentBalance;
        progress = totalToRepay > 0 ? (alreadyRepaid / totalToRepay) * 100 : 0;
      } else {
        progress = (targetAmount / currentBalance) * 100;
      }
      progress = Math.max(0, Math.min(progress, currentBalance <= targetAmount ? 100 : 99.99));
    } else {
      progress = targetAmount > 0 ? Math.min((currentBalance / targetAmount) * 100, 100) : 0;
    }
    
    progress = Math.round(progress * 100) / 100;
    
    return { progress, currentAmount: currentBalance, isCredit, limite };
  };

  // Ouvrir le modal de modification
  const handleEdit = (goal, index) => {
    setEditingGoal(goal);
    setEditingIndex(index);
    setFormData({
      nom: goal.nom || '',
      type: goal.type || 'epargne',
      montantCible: goal.montantCible?.toString() || '',
      dateEcheance: goal.dateEcheance || '',
      priorite: goal.priorite || 'moyenne',
      compteAssocie: goal.compteAssocie || '',
      notes: goal.notes || ''
    });
  };

  // Ouvrir le modal de suppression
  const handleDeleteClick = (goal, index) => {
    setDeletingGoal({ goal, index });
  };

  // Confirmer la suppression
  const handleConfirmDelete = () => {
    if (deletingGoal) {
      const newData = { ...userData };
      newData.financialGoals.splice(deletingGoal.index, 1);
      saveUserData(newData);
      setDeletingGoal(null);
    }
  };

  // Annuler la suppression
  const handleCancelDelete = () => {
    setDeletingGoal(null);
  };

  // Sauvegarder les modifications
  const handleSave = () => {
    if (!formData.nom || !formData.montantCible) {
      alert(t('goals.validation.required'));
      return;
    }

    if (editingGoal) {
      const updatedGoal = {
        ...formData,
        id: editingGoal.id,
        montantCible: parseFloat(formData.montantCible)
      };
      const newData = { ...userData };
      newData.financialGoals[editingIndex] = updatedGoal;
      saveUserData(newData);
    } else {
      const newGoal = {
        ...formData,
        id: Date.now(),
        montantCible: parseFloat(formData.montantCible)
      };
      const newData = { ...userData };
      if (!newData.financialGoals) {
        newData.financialGoals = [];
      }
      newData.financialGoals.push(newGoal);
      saveUserData(newData);
    }
    
    handleCancel();
  };

  // Annuler la modification
  const handleCancel = () => {
    setEditingGoal(null);
    setEditingIndex(null);
    setShowAddForm(false);
    setFormData({
      nom: '',
      type: 'epargne',
      montantCible: '',
      dateEcheance: '',
      priorite: 'moyenne',
      compteAssocie: '',
      notes: ''
    });
  };

  // Ouvrir le formulaire d'ajout
  const handleAddNew = () => {
    // 🔒 Vérifier la limite de destinations selon l'abonnement
    const currentDestinationCount = userData?.financialGoals?.length || 0;
    if (!canAddMore('destinations', currentDestinationCount)) {
      setUpgradeModal({ isOpen: true, type: 'destinations' });
      return;
    }
    
    setEditingGoal(null);
    setEditingIndex(null);
    setShowAddForm(true);
    setFormData({
      nom: '',
      type: 'epargne',
      montantCible: '',
      dateEcheance: '',
      priorite: 'moyenne',
      compteAssocie: '',
      notes: ''
    });
  };

  // Ouvrir le popup détails
  const openDetailsModal = (goal, index) => {
    setShowDetailsModal({ goal, index });
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: '1.2em', color: '#7f8c8d' }}>{t('common.loading')}</p>
      </div>
    );
  }

  if (!userData || !userData.financialGoals) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: '1.2em', color: '#7f8c8d' }}>
          {t('goals.noData')}
        </p>
      </div>
    );
  }

  const objectifs = userData.financialGoals || [];

  // Rendu d'une carte objectif
  const renderObjectifCard = (obj, index) => {
    const { progress, currentAmount, isCredit, limite } = calculateRealProgress(obj);
    const priorityColor = getPriorityColor(obj.priorite);
    const icon = obj.compteAssocie ? getCompteIcon(obj.compteAssocie) : getObjectifIcon(obj.type);
    const targetAmount = parseFloat(obj.montantCible) || 0;
    const isLocked = index >= limits.maxDestinations;

    return (
      <div
        key={obj.id || index}
        {...(index === 0 ? { 'data-tooltip': 'goal-card' } : {})}
        style={{
          position: 'relative',
          background: isDark ? 'rgba(255,255,255,0.1)' : '#ffffff',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: isMobile ? '14px 16px' : '18px 22px',
          boxShadow: isDark ? '0 4px 15px rgba(0,0,0,0.1)' : '0 4px 15px rgba(0,0,0,0.08)',
          border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.08)',
          transition: 'all 0.2s',
          filter: isLocked ? 'blur(4px)' : 'none',
          opacity: isLocked ? 0.6 : 1,
          pointerEvents: isLocked ? 'none' : 'auto'
        }}
        onMouseEnter={(e) => {
          if (!isLocked) {
            e.currentTarget.style.boxShadow = isDark ? '0 8px 25px rgba(0,0,0,0.2)' : '0 8px 25px rgba(0,0,0,0.12)';
            e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.15)' : '#f8fafc';
          }
        }}
        onMouseLeave={(e) => {
          if (!isLocked) {
            e.currentTarget.style.boxShadow = isDark ? '0 4px 15px rgba(0,0,0,0.1)' : '0 4px 15px rgba(0,0,0,0.08)';
            e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : '#ffffff';
          }
        }}
      >
        {/* Badge verrou pour objectifs verrouillés */}
        {isLocked && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setUpgradeModal({ isOpen: true, type: 'destinations' });
            }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
              filter: 'none',
              pointerEvents: 'auto',
              background: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.75)',
              borderRadius: '15px',
              width: '130px',
              height: '80px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'}
          >
            <span style={{ fontSize: '1.8em' }}>🔒</span>
            <span style={{ fontSize: '0.75em', color: 'white', fontWeight: '600' }}>
              {t('subscription.upgrade.unlock', 'Débloquer')}
            </span>
          </div>
        )}
        {/* Ligne principale */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '10px' : '15px',
          marginBottom: '10px'
        }}>
          {/* Icône */}
          <span style={{ fontSize: isMobile ? '1.8em' : '2.2em' }}>{icon}</span>
          
          {/* Nom et compte */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontSize: isMobile ? '0.95em' : '1.1em',
              fontWeight: 'bold',
              color: isDark ? 'white' : '#1e293b',
              margin: 0,
              whiteSpace: isMobile ? 'normal' : 'nowrap',
              overflow: isMobile ? 'visible' : 'hidden',
              textOverflow: isMobile ? 'clip' : 'ellipsis',
              lineHeight: isMobile ? '1.2' : 'normal'
            }}>
              {obj.nom}
            </h3>
            {obj.compteAssocie && (
              <p style={{
                fontSize: isMobile ? '0.75em' : '0.8em',
                color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b',
                margin: '3px 0 0 0',
                whiteSpace: isMobile ? 'normal' : 'nowrap',
                overflow: isMobile ? 'visible' : 'hidden',
                textOverflow: isMobile ? 'clip' : 'ellipsis'
              }}>
                {obj.compteAssocie}
              </p>
            )}
          </div>

          {/* Montants */}
          <div style={{ textAlign: 'right', minWidth: isMobile ? '90px' : '140px' }}>
            {isCredit ? (
              <>
                <p style={{
                  fontSize: isMobile ? `${getAmountFontSize(targetAmount) * 0.7}em` : `${getAmountFontSize(targetAmount)}em`,
                  fontWeight: 'bold',
                  color: '#3498db',
                  margin: 0
                }}>
                  {formatMontant(targetAmount)}
                </p>
                <p style={{
                  fontSize: isMobile ? `${getAmountFontSize(currentAmount, true) * 0.8}em` : `${getAmountFontSize(currentAmount, true)}em`,
                  color: '#ffa500',
                  margin: '2px 0 0 0'
                }}>
                  {t('goals.debt')}: {formatMontant(currentAmount)}
                </p>
              </>
            ) : (
              <>
                <p style={{
                  fontSize: isMobile ? `${getAmountFontSize(currentAmount) * 0.7}em` : `${getAmountFontSize(currentAmount)}em`,
                  fontWeight: 'bold',
                  color: isDark ? 'white' : '#1e293b',
                  margin: 0
                }}>
                  {formatMontant(currentAmount)}
                </p>
                <p style={{
                  fontSize: isMobile ? `${getAmountFontSize(targetAmount, true) * 0.8}em` : `${getAmountFontSize(targetAmount, true)}em`,
                  color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b',
                  margin: '2px 0 0 0'
                }}>
                  {t('goals.of')} {formatMontant(targetAmount)}
                </p>
              </>
            )}
          </div>

          {/* Badge priorité */}
          <div style={{
            padding: isMobile ? '3px 8px' : '4px 10px',
            borderRadius: '8px',
            background: priorityColor.bg,
            border: `1px solid ${priorityColor.border}`,
            color: priorityColor.text,
            fontSize: isMobile ? '0.6em' : '0.7em',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}>
            {obj.priorite === 'haute' ? `🔵 ${t('goals.priority.high')}` : obj.priorite === 'moyenne' ? `🟢 ${t('goals.priority.medium')}` : `🟠 ${t('goals.priority.low')}`}
          </div>
        </div>

        {/* Barre de progression */}
        <div style={{ marginBottom: isMobile ? '8px' : '10px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '5px'
          }}>
            <span style={{ 
              fontSize: isMobile ? '0.75em' : '0.85em', 
              fontWeight: '600',
              color: isCredit ? '#ffa500' : (isDark ? 'rgba(255,255,255,0.7)' : '#64748b')
            }}>
              {isCredit ? t('goals.repayment') : t('goals.distanceTraveled')}
            </span>
            <span style={{
              fontSize: isMobile ? '0.75em' : '0.85em',
              fontWeight: '600',
              color: progress >= 100 ? '#10b981' : isCredit ? '#ffa500' : (isDark ? 'white' : '#1e293b')
            }}>
              {progress}%
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
            borderRadius: '6px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: progress >= 100 
                ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                : isCredit
                ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
              width: `${progress}%`,
              transition: 'width 0.5s ease',
              borderRadius: '6px'
            }}></div>
          </div>
        </div>

        {/* Boutons d'action compacts */}
        <div style={{
          display: 'flex',
          gap: isMobile ? '6px' : '8px',
          justifyContent: 'flex-end'
        }}>
          <button 
            onClick={() => openDetailsModal(obj, index)}
            style={{
              padding: isMobile ? '5px 10px' : '6px 14px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.5)',
              borderRadius: '6px',
              color: '#60a5fa',
              fontWeight: '500',
              fontSize: isMobile ? '0.85em' : '1em',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#3b82f6';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              e.currentTarget.style.color = '#60a5fa';
            }}
          >
            📊 {t('goals.details')}
          </button>
          <button 
            onClick={() => handleEdit(obj, index)}
            style={{
              padding: isMobile ? '5px 10px' : '6px 14px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              borderRadius: '6px',
              color: '#fbbf24',
              fontWeight: '500',
              fontSize: isMobile ? '0.85em' : '1em',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f59e0b';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
              e.currentTarget.style.color = '#fbbf24';
            }}
          >
            ✏️ {t('goals.edit')}
          </button>
          <button 
            onClick={() => handleDeleteClick(obj, index)}
            style={{
              padding: isMobile ? '5px 8px' : '6px 10px',
              background: 'rgba(231, 76, 60, 0.1)',
              border: '1px solid rgba(231, 76, 60, 0.5)',
              borderRadius: '6px',
              color: '#f87171',
              fontWeight: '500',
              fontSize: isMobile ? '0.85em' : '1em',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e74c3c';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(231, 76, 60, 0.1)';
              e.currentTarget.style.color = '#f87171';
            }}
          >
            🗑️
          </button>
        </div>
      </div>
    );
  };

  // Contenu principal (réutilisé en mode normal et plein écran)
  const renderContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {objectifs.length === 0 ? (
        <div style={{
          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(102, 126, 234, 0.08)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          border: isDark ? '2px dashed rgba(255,255,255,0.3)' : '2px dashed rgba(102, 126, 234, 0.3)'
        }}>
          <span style={{ fontSize: '3em' }}>🧭</span>
          <h3 style={{ fontSize: '1.1em', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', marginTop: '15px' }}>
            {t('goals.emptyState')}
          </h3>
        </div>
      ) : (
        objectifs.map((obj, index) => renderObjectifCard(obj, index))
      )}

      {/* Bouton Ajouter une destination */}
      <div 
        data-tooltip="add-goal"
        onClick={() => { if (!(showGuide || isTooltipActive || showContinueBar)) handleAddNew(); }}
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)',
          borderRadius: '12px',
          padding: '25px',
          border: '2px dashed rgba(59, 130, 246, 0.5)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.25)';
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.2) 100%)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)';
        }}
      >
        <span style={{ fontSize: '2.5em', display: 'inline-block', marginBottom: '8px' }}>➕</span>
        <h3 style={{
        fontSize: '1.1em',
        fontWeight: 'bold',
        color: '#60a5fa',
        margin: 0
        }}>
        {t('goals.addDestination')}
        </h3>
      </div>
    </div>
  );

  return (
    <>
      <style>
        {`
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

      {/* CONTENEUR BLANC pour le reste du contenu */}
      <div 
        style={{ 
          height: 'calc(95vh - 70px)', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'auto',
          padding: '20px',
          background: 'transparent',
          position: 'relative'
        }}
      >
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
        {/* Header avec titre */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h1 style={{ 
            fontSize: '1.8em', 
            fontWeight: 'bold', 
            color: isDark ? 'white' : '#1e293b', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            margin: 0 
          }}>
            🧭 {t('goals.title')}
          </h1>
        </div>

        {renderContent()}
      </div> {/* Fin conteneur blanc */}
      </div> {/* Fin wrapper bleu */}

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
            padding: isMobile ? '15px 15px 10px 15px' : '15px 30px',
            paddingTop: isMobile && window.matchMedia('(display-mode: standalone)').matches ? 'max(50px, env(safe-area-inset-top, 50px))' : '15px',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'transparent',
            flexShrink: 0
          }}>
            <h1 style={{ 
              fontSize: isMobile ? '1.1em' : '1.8em', 
              fontWeight: 'bold', 
              color: isDark ? 'white' : '#1e293b', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              margin: 0
            }}>
              🧭 {t('goals.titleFullscreen')}
            </h1>
            
            {/* Boutons à droite */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '15px' }}>
              {/* 📱 PWA Mobile: Bouton "On continue!" dans le header */}
              {isMobile && showContinueBar && (
                <button
                  onClick={continueToNextPage}
                  style={{
                    background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '10px 20px',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.9em',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(255, 152, 0, 0.4)',
                    transition: 'all 0.3s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t('common.onContinue')} →
                </button>
              )}
              
              {/* Boutons X et Œil */}
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
          </div>

          {/* Contenu plein écran */}
          <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '10px 15px' : '20px 30px' }}>
            {renderContent()}
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

      {/* ========== MODAL DÉTAILS ========== */}
      {showDetailsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '550px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            border: '2px solid rgba(76,175,80,0.3)',
            animation: 'modal-appear 0.25s ease-out'
          }}>
            {(() => {
              const obj = showDetailsModal.goal;
              const { progress, currentAmount, isCredit, limite } = calculateRealProgress(obj);
              const icon = obj.compteAssocie ? getCompteIcon(obj.compteAssocie) : getObjectifIcon(obj.type);
              const targetAmount = parseFloat(obj.montantCible) || 0;
              const priorityColor = getPriorityColor(obj.priorite);

              return (
                <>
                  {/* Header du modal */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    marginBottom: '25px',
                    paddingBottom: '15px',
                    borderBottom: '2px solid rgba(255,255,255,0.2)'
                  }}>
                    <span style={{ fontSize: '2.5em' }}>{icon}</span>
                    <div style={{ flex: 1 }}>
                      <h2 style={{ margin: 0, fontSize: '1.4em', color: 'white' }}>{obj.nom}</h2>
                      {obj.compteAssocie && (
                        <p style={{ margin: '5px 0 0', fontSize: '0.9em', color: 'rgba(255,255,255,0.7)' }}>
                          {t('goals.detailsModal.account')}: {obj.compteAssocie}
                        </p>
                      )}
                    </div>
                    <div style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: priorityColor.bg,
                      border: `1px solid ${priorityColor.border}`,
                      color: priorityColor.text,
                      fontSize: '0.8em',
                      fontWeight: '600'
                    }}>
                      {obj.priorite === 'haute' ? `🔵 ${t('goals.priority.high')}` : obj.priorite === 'moyenne' ? `🟢 ${t('goals.priority.medium')}` : `🟠 ${t('goals.priority.low')}`}
                    </div>
                  </div>

                  {/* Contenu des détails */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {isCredit && limite > 0 && (
                      <div style={{ 
                        padding: '12px 16px', 
                        background: 'rgba(255,255,255,0.95)', 
                        borderRadius: '10px',
                        border: '1px solid rgba(255,165,0,0.5)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ color: '#ffa500', fontWeight: '500' }}>💳 {t('goals.detailsModal.creditLimit')}</span>
                        <span style={{ fontWeight: 'bold', color: '#ffa500', fontSize: `${getAmountFontSize(limite) * 0.85}em` }}>
                          {formatMontant(limite)}
                        </span>
                      </div>
                    )}
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '12px'
                    }}>
                      <div style={{ 
                        padding: '12px 16px', 
                        background: 'rgba(255,255,255,0.95)', 
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.3)'
                      }}>
                        <span style={{ color: '#7f8c8d', fontSize: '0.85em', display: 'block', marginBottom: '5px' }}>
                          {t('goals.detailsModal.currentAmount')}
                        </span>
                        <span style={{ fontWeight: 'bold', color: isCredit ? '#ffa500' : '#3498db', fontSize: `${getAmountFontSize(currentAmount) * 0.95}em` }}>
                          {formatMontant(currentAmount)}
                        </span>
                      </div>
                      
                      <div style={{ 
                        padding: '12px 16px', 
                        background: 'rgba(255,255,255,0.95)', 
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.3)'
                      }}>
                        <span style={{ color: '#7f8c8d', fontSize: '0.85em', display: 'block', marginBottom: '5px' }}>
                          {t('goals.detailsModal.targetAmount')}
                        </span>
                        <span style={{ fontWeight: 'bold', color: '#3498db', fontSize: `${getAmountFontSize(targetAmount) * 0.95}em` }}>
                          {formatMontant(targetAmount)}
                        </span>
                      </div>
                    </div>

                    <div style={{ 
                      padding: '12px 16px', 
                      background: 'rgba(255,255,255,0.95)', 
                      borderRadius: '10px',
                      border: `1px solid ${isCredit ? 'rgba(255,165,0,0.5)' : 'rgba(76,175,80,0.5)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ color: isCredit ? '#ffa500' : '#4CAF50', fontWeight: '500' }}>
                        {isCredit ? `💸 ${t('goals.detailsModal.remainingToRepay')}` : `🧭 ${t('goals.detailsModal.remainingToReach')}`}
                      </span>
                      <span style={{ fontWeight: 'bold', color: isCredit ? '#ffa500' : '#4CAF50', fontSize: '1.1em' }}>
                        {isCredit 
                          ? formatMontant(Math.max(0, currentAmount - targetAmount))
                          : formatMontant(Math.max(0, targetAmount - currentAmount))
                        }
                      </span>
                    </div>

                    <div style={{ 
                      padding: '15px 16px', 
                      background: 'rgba(255,255,255,0.95)', 
                      borderRadius: '10px',
                      border: `2px solid ${progress >= 100 ? '#4CAF50' : '#ffa500'}`
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <span style={{ fontWeight: '600', color: progress >= 100 ? '#4CAF50' : '#ffa500' }}>
                          📊 {t('goals.detailsModal.progression')}
                        </span>
                        <span style={{ 
                          fontWeight: 'bold', 
                          fontSize: '1.3em',
                          color: progress >= 100 ? '#4CAF50' : '#ffa500' 
                        }}>
                          {progress}%
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '10px',
                        background: 'rgba(255,255,255,0.6)',
                        borderRadius: '6px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          background: progress >= 100 
                            ? 'linear-gradient(90deg, #4CAF50 0%, #45a049 100%)'
                            : 'linear-gradient(90deg, #ffa500 0%, #ff8c00 100%)',
                          width: `${progress}%`,
                          borderRadius: '6px'
                        }}></div>
                      </div>
                    </div>

                    {obj.dateEcheance && (
                      <div style={{ 
                        padding: '12px 16px', 
                        background: 'rgba(255,255,255,0.95)', 
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.3)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ color: '#7f8c8d' }}>📅 {t('goals.detailsModal.deadline')}</span>
                        <span style={{ fontWeight: '600', color: '#3498db' }}>
                          {new Date(obj.dateEcheance).toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}

                    {obj.notes && (
                      <div style={{ 
                        padding: '12px 16px', 
                        background: 'rgba(255,255,255,0.95)', 
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.3)'
                      }}>
                        <span style={{ color: '#7f8c8d', fontSize: '0.85em', display: 'block', marginBottom: '5px' }}>
                          📝 {t('goals.detailsModal.notes')}
                        </span>
                        <p style={{ margin: 0, color: '#2c3e50', fontStyle: 'italic' }}>
                          {obj.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bouton fermer */}
                  <button
                    onClick={() => setShowDetailsModal(null)}
                    style={{
                      width: '100%',
                      marginTop: '25px',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '1em',
                      cursor: 'pointer'
                    }}
                  >
                    {t('goals.detailsModal.close')}
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========== MODAL DE SUPPRESSION ========== */}
      {deletingGoal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
            borderRadius: '20px',
            padding: '35px 40px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            border: '2px solid rgba(231,76,60,0.4)',
            textAlign: 'center',
            animation: 'modal-appear 0.25s ease-out'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(231,76,60,0.3) 0%, rgba(192,57,43,0.3) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '2.5em'
            }}>
              🗑️
            </div>

            <h2 style={{
              fontSize: '1.4em',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '15px'
            }}>
              {t('goals.deleteModal.title')}
            </h2>

            <p style={{
              fontSize: '1em',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '10px',
              lineHeight: '1.5'
            }}>
              {t('goals.deleteModal.confirm')}
            </p>
            <p style={{
              fontSize: '1.1em',
              fontWeight: 'bold',
              color: '#e74c3c',
              marginBottom: '25px'
            }}>
              "{deletingGoal.goal.nom}" ?
            </p>

            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  padding: '12px 30px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '10px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '1em',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '12px 30px',
                  background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '1em',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(231, 76, 60, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                🗑️ {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL DE MODIFICATION/AJOUT ========== */}
      {(editingGoal || showAddForm) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '85vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            border: '2px solid rgba(76,175,80,0.3)',
            animation: 'modal-appear 0.25s ease-out'
          }}>
            <h2 style={{
              fontSize: '1.5em',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '20px'
            }}>
              {editingGoal ? `✏️ ${t('goals.form.editTitle')}` : `➕ ${t('goals.form.addTitle')}`}
            </h2>

            {/* 💡 Suggestions avec effet flottant */}
            {!editingGoal && (
              <div 
                className="goal-suggestions-scroll"
                style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap',
                  gap: '8px',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  paddingBottom: '8px',
                  paddingTop: '4px',
                  paddingRight: '4px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#667eea rgba(255,255,255,0.1)',
                  marginBottom: '10px'
                }}>
                {/* Toutes les suggestions avec le même style */}
                {GOAL_SUGGESTIONS.map((s, i) => (
                  <button
                    key={`suggestion-${i}`}
                    type="button"
                    onClick={() => setFormData({...formData, nom: t(`goals.suggestions.${s.key}`), type: s.type})}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '22px',
                      border: formData.nom === t(`goals.suggestions.${s.key}`) ? '2px solid #667eea' : '2px solid #667eea60',
                      background: formData.nom === t(`goals.suggestions.${s.key}`) 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                        : 'linear-gradient(135deg, #667eea30 0%, #764ba215 100%)',
                      color: formData.nom === t(`goals.suggestions.${s.key}`) ? 'white' : '#667eea',
                      fontSize: '0.88em',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      boxShadow: formData.nom === t(`goals.suggestions.${s.key}`) 
                        ? '0 4px 15px rgba(102, 126, 234, 0.5)' 
                        : '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      if (formData.nom !== t(`goals.suggestions.${s.key}`)) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #667eea50 0%, #764ba230 100%)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.nom !== t(`goals.suggestions.${s.key}`)) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #667eea30 0%, #764ba215 100%)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    <span style={{ fontSize: '1.1em' }}>{s.icon}</span>
                    <span>{t(`goals.suggestions.${s.key}`)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Formulaire */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Nom */}
              <div>
                <label style={{ display: 'block', fontSize: '1.1em', color: 'white', marginBottom: '8px', fontWeight: '700' }}>
                  {t('goals.form.name')} *
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  placeholder={t('goals.form.namePlaceholder')}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '1em',
                    border: '2px solid rgba(76,175,80,0.5)',
                    borderRadius: '10px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.95)',
                    fontWeight: '500'
                  }}
                />
              </div>

              {/* Type et Priorité */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '1.1em', color: 'white', marginBottom: '8px', fontWeight: '700' }}>
                    {t('goals.form.type')}
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '1.05em',
                      border: '2px solid rgba(52,152,219,0.6)',
                      borderRadius: '10px',
                      outline: 'none',
                      background: 'rgba(255,255,255,0.95)',
                      fontWeight: '600',
                      color: '#2c3e50',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="epargne" style={{ fontSize: '1.1em', padding: '10px' }}>🌱 {t('goals.types.savings')}</option>
                    <option value="dette" style={{ fontSize: '1.1em', padding: '10px' }}>💳 {t('goals.types.debt')}</option>
                    <option value="investissement" style={{ fontSize: '1.1em', padding: '10px' }}>📈 {t('goals.types.investment')}</option>
                    <option value="urgence" style={{ fontSize: '1.1em', padding: '10px' }}>🛡️ {t('goals.types.emergency')}</option>
                    <option value="achat" style={{ fontSize: '1.1em', padding: '10px' }}>🛒 {t('goals.types.purchase')}</option>
                    <option value="voyage" style={{ fontSize: '1.1em', padding: '10px' }}>✈️ {t('goals.types.travel')}</option>
                    <option value="autre" style={{ fontSize: '1.1em', padding: '10px' }}>🧭 {t('goals.types.other')}</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '1.1em', color: 'white', marginBottom: '8px', fontWeight: '700' }}>
                    {t('goals.form.priority')}
                  </label>
                  <select
                    value={formData.priorite}
                    onChange={(e) => setFormData({...formData, priorite: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '1.05em',
                      border: '2px solid rgba(52,152,219,0.6)',
                      borderRadius: '10px',
                      outline: 'none',
                      background: 'rgba(255,255,255,0.95)',
                      fontWeight: '600',
                      color: '#2c3e50',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="haute" style={{ fontSize: '1.1em', padding: '10px' }}>🔵 {t('goals.priority.high')}</option>
                    <option value="moyenne" style={{ fontSize: '1.1em', padding: '10px' }}>🟢 {t('goals.priority.medium')}</option>
                    <option value="basse" style={{ fontSize: '1.1em', padding: '10px' }}>🟠 {t('goals.priority.low')}</option>
                  </select>
                </div>
              </div>

              {/* Montant et Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '1.1em', color: 'white', marginBottom: '8px', fontWeight: '700' }}>
                    {t('goals.form.targetAmount')} *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNumpadModal(true)}
                    style={{
                      width: '100%',
                      height: '48px',
                      padding: '12px 14px',
                      fontSize: '1.1em',
                      border: '2px solid rgba(52,152,219,0.6)',
                      borderRadius: '10px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.95)',
                      color: '#3498db',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.3s'
                    }}
                  >
                    <span>{formData.montantCible ? formatMontant(parseFloat(formData.montantCible)) : '0,00 $'}</span>
                    <span style={{ fontSize: '0.7em', opacity: 0.6 }}>⌨️</span>
                  </button>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '1.1em', color: 'white', marginBottom: '8px', fontWeight: '700' }}>
                    {t('goals.form.deadline')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDatePickerModal(true)}
                    style={{
                      width: '100%',
                      height: '48px',
                      padding: '12px 14px',
                      fontSize: '1em',
                      border: '2px solid rgba(52,152,219,0.6)',
                      borderRadius: '10px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.95)',
                      color: '#3498db',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.3s'
                    }}
                  >
                    <span>{formData.dateEcheance ? new Date(formData.dateEcheance).toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : t('goals.form.selectDate', 'Sélectionner')}</span>
                    <span style={{ fontSize: '0.9em', opacity: 0.6 }}>📅</span>
                  </button>
                </div>
              </div>

              {/* Compte associé */}
              <div>
                <label style={{ display: 'block', fontSize: '1.1em', color: 'white', marginBottom: '8px', fontWeight: '700' }}>
                  {t('goals.form.linkedAccount')}
                </label>
                <button
                  type="button"
                  onClick={() => setShowAccountPickerModal(true)}
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '12px 14px',
                    fontSize: '1em',
                    border: '2px solid rgba(52,152,219,0.6)',
                    borderRadius: '10px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.95)',
                    color: formData.compteAssocie ? '#3498db' : '#7f8c8d',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.3s'
                  }}
                >
                  <span>{formData.compteAssocie || t('goals.form.selectAccount')}</span>
                  <span style={{ fontSize: '0.9em', opacity: 0.6 }}>💼</span>
                </button>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '1.1em', color: 'white', marginBottom: '8px', fontWeight: '700' }}>
                  {t('goals.form.notes')}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="2"
                  placeholder={t('goals.form.notesPlaceholder')}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '1em',
                    border: '2px solid rgba(76,175,80,0.5)',
                    borderRadius: '10px',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.95)',
                    fontWeight: '500'
                  }}
                />
              </div>
            </div>

            {/* Boutons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '25px'
            }}>
              <button
                onClick={handleCancel}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '10px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '1em'
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '1em'
                }}
              >
                ✓ {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ========== MODAL GUIDE ONBOARDING ========== */}
      <PageGuideModal
        isOpen={showGuide}
        onClose={closeModal}
        icon="🧭"
        titleKey="goals.guideModal.title"
        messageKey="goals.guideModal.message"
        hintIcon="👆"
        hintKey="goals.guideModal.hint"
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
      
      {/* ========== MODAL UPGRADE (restrictions abonnement) ========== */}
      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ isOpen: false, type: null })}
        limitType={upgradeModal.type}
      />

      {/* ========== NUMPAD MODAL POUR MONTANT CIBLE ========== */}
      <NumpadModal
        isOpen={showNumpadModal}
        onClose={() => setShowNumpadModal(false)}
        onConfirm={(value) => {
          setFormData({ ...formData, montantCible: value.toString() });
          setShowNumpadModal(false);
        }}
        initialValue={formData.montantCible}
        title={t('goals.form.targetAmount')}
        allowNegative={false}
      />

      {/* ========== DATE PICKER MODAL ========== */}
      <DatePickerModal
        isOpen={showDatePickerModal}
        onClose={() => setShowDatePickerModal(false)}
        onConfirm={(date) => {
          setFormData({ ...formData, dateEcheance: date });
          setShowDatePickerModal(false);
        }}
        initialDate={formData.dateEcheance}
        title={t('goals.form.deadline')}
      />

      {/* ========== ACCOUNT PICKER MODAL ========== */}
      <AccountPickerModal
        isOpen={showAccountPickerModal}
        onClose={() => setShowAccountPickerModal(false)}
        onSelect={(accountName) => {
          setFormData({ ...formData, compteAssocie: accountName });
          setShowAccountPickerModal(false);
        }}
        accounts={userData.accounts || []}
        selectedAccount={formData.compteAssocie}
      />
    </>
  );
};

export default Objectifs;
