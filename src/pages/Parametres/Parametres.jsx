// ⚙️ PARAMÈTRES - Configuration utilisateur Pl4to
// 5 sections: Profil, Abonnement, Préférences, Notifications, Sécurité, À propos
// 🌍 i18n enabled
// ✅ Utilise useGuideProgress pour la logique centralisée

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth.service';
import stripeService, { STRIPE_PRICES } from '../../services/stripeService';
import { useSubscription } from '../../context/SubscriptionContext';
import useGuideProgress from '../../hooks/useGuideProgress';
import PageGuideModal from '../../components/common/PageGuideModal';
import { storage } from '../../utils/index.js';
import useTooltipTour from '../../hooks/useTooltipTour';
import TooltipTour from '../../components/common/TooltipTour';
import { useTheme } from '../../context/ThemeContext';
import { trackThemeChanged, trackLanguageChanged } from '../../services/analytics.service';

const Parametres = () => {
  const { user, logout, updateProfile } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startTrial } = useSubscription();
  const { theme, isDark, setTheme, themePreference } = useTheme();
  
  // ✅ Hook centralisé pour la progression du guide
  const { shouldShowGuide, markGuideCompleted, isLoading: isGuideLoading } = useGuideProgress();
  
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
  } = useTooltipTour('parametres', {
    onComplete: () => console.log('[Parametres] Tooltip tour complété')
  });
  
  // Vérifier si le guide doit être affiché
  useEffect(() => {
    if (!isGuideLoading && shouldShowGuide('parametres')) {
      setShowGuide(true);
    }
  }, [shouldShowGuide, isGuideLoading]);
  
  // Fermer le modal et afficher la barre "On continue"
  const closeModal = () => {
    setShowGuide(false);
    setShowContinueBar(true);
  };
  
  // Marquer comme complété et retourner à l'Accueil (fin de l'onboarding)
  const continueToNextPage = () => {
    setShowContinueBar(false);
    markGuideCompleted('parametres');
    // Démarrer le trial de 14 jours
    startTrial();
    setTimeout(() => {
      navigate('/dashboard');
    }, 100);
  };
  

  
  // Mode plein écran
  const [isFullScreen, setIsFullScreen] = useState(false);
  
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
  
  // 📱 Lire le paramètre fullscreen de l'URL (pour navigation depuis Sidebar mobile)
  useEffect(() => {
    const fullscreenParam = searchParams.get('fullscreen');
    if (fullscreenParam === 'true' && isMobile) {
      setIsFullScreen(true);
      // Nettoyer l'URL après avoir lu le paramètre
      navigate('/parametres', { replace: true });
    }
  }, [searchParams, isMobile, navigate]);
  
  // Section active - null sur mobile au départ (affiche seulement le sidebar)
  const [activeSection, setActiveSection] = useState(null);
  
  // Sur desktop, toujours avoir une section active
  useEffect(() => {
    if (!isMobile && activeSection === null) {
      setActiveSection('profil');
    }
  }, [isMobile, activeSection]);
  
  // États du formulaire Profil
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || 'Jhon',
    lastName: user?.lastName || 'Wesley',
    email: user?.email || 'jhon@example.com'
  });
  
  // États changement email
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [emailStep, setEmailStep] = useState('input'); // 'input', 'verify', 'success'
  const [codeSent, setCodeSent] = useState(false);
  
  // États Préférences
  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'fr',
    dateFormat: 'DD/MM/YYYY'
  });
  
  // États Notifications
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: true,
    parcoursAlerts: true,
    milestones: true,
    ameliorationParcours: false,
    ameliorationJour: 'lundi'
  });
  
  // États Sécurité
  const [security, setSecurity] = useState(() => {
    const saved = localStorage.getItem('pl4to_security_settings');
    return saved ? JSON.parse(saved) : {
      twoFactorEnabled: false,
      hideBalances: false
    };
  });
  
  // Sauvegarder les paramètres de sécurité dans localStorage
  useEffect(() => {
    localStorage.setItem('pl4to_security_settings', JSON.stringify(security));
    // Dispatch event pour notifier les autres composants
    window.dispatchEvent(new CustomEvent('securitySettingsChanged', { detail: security }));
  }, [security]);
  
  // État sauvegarde
  const [saveStatus, setSaveStatus] = useState(null);
  
  // États Abonnement
  const [showBetaInfo, setShowBetaInfo] = useState(true);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  
  // État Modal À propos
  const [activeModal, setActiveModal] = useState(null); // 'guide' | 'faq' | 'versions' | 'contact' | 'legal' | 'privacy' | 'bug'
  
  // État formulaire bug
  const [bugForm, setBugForm] = useState({
    type: 'bug',
    description: '',
    email: ''
  });
  const [bugSubmitted, setBugSubmitted] = useState(false);
  
  // 🗑️ États suppression de compte
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  
  // 🗑️ Mot de confirmation selon la langue
  const deleteConfirmWord = i18n.language === 'fr' ? 'SUPPRIMER' : 'DELETE';
  
  // 🔐 États 2FA
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [show2FABackupModal, setShow2FABackupModal] = useState(false);
  const [show2FADisableModal, setShow2FADisableModal] = useState(false);
  const [twoFASetupData, setTwoFASetupData] = useState(null); // { qrCode, secret }
  const [twoFABackupCodes, setTwoFABackupCodes] = useState([]);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAPassword, setTwoFAPassword] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [showLogoutSuccessModal, setShowLogoutSuccessModal] = useState(false);
  const [twoFAError, setTwoFAError] = useState(null);
  const [twoFAStatus, setTwoFAStatus] = useState({ enabled: false, backupCodesRemaining: 0 });
  
  // 🔐 Charger le statut 2FA au montage
  useEffect(() => {
    const load2FAStatus = async () => {
      try {
        const status = await authService.get2FAStatus();
        setTwoFAStatus(status);
        setSecurity(prev => ({ ...prev, twoFactorEnabled: status.enabled }));
      } catch (error) {
        console.error('Erreur chargement statut 2FA:', error);
      }
    };
    load2FAStatus();
  }, []);
  
  // 🔐 Démarrer la configuration 2FA
  const handleSetup2FA = async () => {
    setTwoFALoading(true);
    setTwoFAError(null);
    try {
      const data = await authService.setup2FA();
      setTwoFASetupData(data);
      setShow2FASetupModal(true);
    } catch (error) {
      setTwoFAError(error.response?.data?.message || 'Erreur lors de la configuration');
    } finally {
      setTwoFALoading(false);
    }
  };
  
  // 🔐 Vérifier et activer 2FA
  const handleVerify2FA = async () => {
    if (twoFACode.length !== 6) return;
    
    setTwoFALoading(true);
    setTwoFAError(null);
    try {
      const result = await authService.verify2FA(twoFACode);
      setTwoFABackupCodes(result.backupCodes);
      setTwoFAStatus({ enabled: true, backupCodesRemaining: result.backupCodes.length });
      setSecurity(prev => ({ ...prev, twoFactorEnabled: true }));
      setShow2FASetupModal(false);
      setShow2FABackupModal(true);
      setTwoFACode('');
    } catch (error) {
      setTwoFAError(error.response?.data?.message || 'Code invalide');
    } finally {
      setTwoFALoading(false);
    }
  };
  
  // 🔐 Désactiver 2FA
  const handleDisable2FA = async () => {
    if (!twoFAPassword) return;
    
    setTwoFALoading(true);
    setTwoFAError(null);
    try {
      await authService.disable2FA(twoFAPassword);
      setTwoFAStatus({ enabled: false, backupCodesRemaining: 0 });
      setSecurity(prev => ({ ...prev, twoFactorEnabled: false }));
      setShow2FADisableModal(false);
      setTwoFAPassword('');
    } catch (error) {
      setTwoFAError(error.response?.data?.message || 'Mot de passe incorrect');
    } finally {
      setTwoFALoading(false);
    }
  };
  
  // 🔐 Régénérer les codes backup
  const handleRegenerateBackup = async () => {
    if (twoFACode.length !== 6) return;
    
    setTwoFALoading(true);
    setTwoFAError(null);
    try {
      const result = await authService.regenerateBackupCodes(twoFACode);
      setTwoFABackupCodes(result.backupCodes);
      setTwoFAStatus(prev => ({ ...prev, backupCodesRemaining: result.backupCodes.length }));
      setTwoFACode('');
    } catch (error) {
      setTwoFAError(error.response?.data?.message || 'Code invalide');
    } finally {
      setTwoFALoading(false);
    }
  };
  
  // 🗑️ Fonction de suppression de compte
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== deleteConfirmWord) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      const token = storage.getAuthToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la suppression');
      }
      
      // Nettoyage complet du localStorage
      localStorage.clear();
      
      // Déconnexion et redirection
      logout();
      navigate('/');
      
    } catch (error) {
      console.error('Erreur suppression compte:', error);
      setDeleteError(error.message);
      setIsDeleting(false);
    }
  };
  
  // 💳 États et fonctions Stripe
  const [stripeLoading, setStripeLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  
  // 💳 Charger le statut d'abonnement au montage
  useEffect(() => {
    const loadSubscriptionStatus = async () => {
      if (user?.email) {
        try {
          const status = await stripeService.getSubscriptionStatus(user.email);
          setSubscriptionStatus(status);
        } catch (error) {
          console.log('[Stripe] Pas d\'abonnement actif ou erreur:', error);
        }
      }
    };
    loadSubscriptionStatus();
  }, [user?.email]);
  
  // 💳 Lancer le checkout Stripe
  const handleStripeCheckout = async (priceId, isBetaFounder = false) => {
    if (!user?.email || !user?.id) {
      console.error('[Stripe] User info manquante');
      return;
    }
    
    setStripeLoading(true);
    try {
      await stripeService.createCheckoutSession(
        priceId,
        user.id,
        user.email,
        isBetaFounder
      );
    } catch (error) {
      console.error('[Stripe] Erreur checkout:', error);
      alert('Erreur lors du paiement. Réessayez.');
    } finally {
      setStripeLoading(false);
    }
  };
  
  // 💳 Ouvrir le portail client Stripe
  const handleOpenPortal = async () => {
    if (!user?.email) return;
    
    setStripeLoading(true);
    try {
      await stripeService.openCustomerPortal(user.email);
    } catch (error) {
      console.error('[Stripe] Erreur portail:', error);
      alert('Erreur lors de l\'ouverture du portail.');
    } finally {
      setStripeLoading(false);
    }
  };
  
  // Sections de navigation (sans Mes Données)
  const navSections = [
    { id: 'profil', icon: '👤', label: t('settings.nav.profile') },
    { id: 'abonnement', icon: '💎', label: t('settings.nav.subscription') },
    { id: 'preferences', icon: '🎨', label: t('settings.nav.preferences') },
    // { id: 'notifications', icon: '🔔', label: t('settings.nav.notifications') }, // 🚧 Post-lancement: Notifications pas encore implémentées
    { id: 'securite', icon: '🔒', label: t('settings.nav.security') },
    { id: 'apropos', icon: 'ℹ️', label: t('settings.nav.about') }
  ];
  

  
  // Gérer Escape pour fermer plein écran et modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activeModal) {
          setActiveModal(null);
        } else if (isFullScreen) {
          setIsFullScreen(false);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, activeModal]);
  
  // Sauvegarder le profil
  const handleSave = async (section) => {
    setSaveStatus('saving');
    
    try {
      if (section === 'profil') {
        // Sauvegarder le profil via l'API
        const result = await updateProfile({
          firstName: profileData.firstName,
          lastName: profileData.lastName
        });
        
        if (result.success) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(null), 2000);
        } else {
          setSaveStatus(null);
          alert(result.error || t('settings.save.error'));
        }
      } else {
        // Pour les autres sections, simulation (ou implémenter d'autres API)
        setTimeout(() => {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(null), 2000);
        }, 800);
      }
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      setSaveStatus(null);
      alert(t('settings.save.error'));
    }
  };
  
  // Envoyer code de vérification pour changement d'email
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [emailChangeError, setEmailChangeError] = useState(null);
  
  const sendVerificationCode = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      alert(t('settings.profile.emailChange.invalidEmail'));
      return;
    }
    
    setEmailChangeLoading(true);
    setEmailChangeError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/change-email/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newEmail })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi du code');
      }
      
      setCodeSent(true);
      setEmailStep('verify');
      console.log('[✅ Email Change] Code envoyé à:', newEmail);
      
    } catch (error) {
      console.error('Erreur envoi code:', error);
      setEmailChangeError(error.message);
      alert(error.message);
    } finally {
      setEmailChangeLoading(false);
    }
  };
  
  // Vérifier le code et changer l'email
  const verifyCode = async () => {
    if (verificationCode.length !== 6) {
      alert(t('settings.profile.emailChange.invalidCode'));
      return;
    }
    
    setEmailChangeLoading(true);
    setEmailChangeError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/change-email/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verificationCode })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Code incorrect');
      }
      
      // Succès - mettre à jour l'interface
      setEmailStep('success');
      setProfileData({...profileData, email: newEmail});
      
      // Mettre à jour le contexte utilisateur si nécessaire
      if (data.user) {
        // L'email a été changé côté serveur
        console.log('[✅ Email Changed] Nouveau:', data.user.email);
      }
      
      setTimeout(() => {
        setIsChangingEmail(false);
        setEmailStep('input');
        setNewEmail('');
        setVerificationCode('');
        setCodeSent(false);
      }, 2000);
      
    } catch (error) {
      console.error('Erreur vérification code:', error);
      setEmailChangeError(error.message);
      alert(error.message);
    } finally {
      setEmailChangeLoading(false);
    }
  };
  

  // Bouton de sauvegarde
  const SaveButton = ({ section }) => (
    <button
      onClick={() => handleSave(section)}
      disabled={saveStatus === 'saving'}
      style={{
        background: saveStatus === 'saved' 
          ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        padding: '12px 32px',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '1em',
        cursor: saveStatus === 'saving' ? 'wait' : 'pointer',
        transition: 'all 0.3s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '24px'
      }}
    >
      {saveStatus === 'saving' ? (
        <>⏳ {t('settings.save.saving')}</>
      ) : saveStatus === 'saved' ? (
        <>✅ {t('settings.save.saved')}</>
      ) : (
        <>💾 {t('settings.save.button')}</>
      )}
    </button>
  );
  
  // ===== SECTION PROFIL (avec changement email par code) =====
  const renderProfil = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ 
        fontSize: '1.75rem', 
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: isDark ? 'white' : '#1e293b'
      }}>
        👤 {t('settings.profile.title')}
      </h2>
      
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: isDark ? 'rgba(255,255,255,0.9)' : '#4a5568' }}>
          {t('settings.profile.firstName')}
        </label>
        <input
          type="text"
          value={profileData.firstName}
          onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '12px 16px',
            border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '1rem',
            background: isDark ? 'rgba(255,255,255,0.1)' : '#ffffff',
            color: isDark ? 'white' : '#1e293b'
          }}
        />
      </div>
      
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: isDark ? 'rgba(255,255,255,0.9)' : '#4a5568' }}>
          {t('settings.profile.lastName')}
        </label>
        <input
          type="text"
          value={profileData.lastName}
          onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '12px 16px',
            border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '1rem',
            background: isDark ? 'rgba(255,255,255,0.1)' : '#ffffff',
            color: isDark ? 'white' : '#1e293b'
          }}
        />
      </div>
      
      {/* Email avec changement par code */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: isDark ? 'rgba(255,255,255,0.9)' : '#4a5568' }}>
          {t('settings.profile.email')}
        </label>
        
        {!isChangingEmail ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="email"
              value={profileData.email}
              disabled
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '12px 16px',
                border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.15)',
                borderRadius: '12px',
                fontSize: '1rem',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b'
              }}
            />
            <button
              onClick={() => setIsChangingEmail(true)}
              style={{
                padding: '12px 20px',
                border: '2px solid #667eea',
                borderRadius: '12px',
                background: 'transparent',
                color: '#667eea',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              ✏️ {t('settings.profile.modify')}
            </button>
          </div>
        ) : (
          <div style={{
            padding: '20px',
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.03)',
            borderRadius: '12px',
            maxWidth: '500px',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)'
          }}>
            {emailStep === 'input' && (
              <>
                <p style={{ margin: '0 0 12px', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', fontSize: '0.9em' }}>
                  {t('settings.profile.emailChange.instruction')}
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={t('settings.profile.emailChange.placeholder')}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.15)',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)',
                      color: isDark ? 'white' : '#1e293b'
                    }}
                  />
                  <button
                    onClick={sendVerificationCode}
                    disabled={emailChangeLoading}
                    style={{
                      padding: '12px 20px',
                      border: 'none',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      fontWeight: '600',
                      cursor: emailChangeLoading ? 'wait' : 'pointer',
                      whiteSpace: 'nowrap',
                      opacity: emailChangeLoading ? 0.7 : 1
                    }}
                  >
                    {emailChangeLoading ? '⏳ ...' : `📧 ${t('settings.profile.emailChange.sendCode')}`}
                  </button>
                </div>
                <button
                  onClick={() => { setIsChangingEmail(false); setNewEmail(''); }}
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'transparent',
                    color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {t('common.cancel')}
                </button>
              </>
            )}
            
            {emailStep === 'verify' && (
              <>
                <div style={{
                  padding: '12px',
                  background: 'rgba(52, 152, 219, 0.2)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>✉️</span>
                  <span style={{ color: '#3498db', fontSize: '0.9em' }}>
                    {t('settings.profile.emailChange.codeSent')} <strong>{newEmail}</strong>
                  </span>
                </div>
                <p style={{ margin: '0 0 12px', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', fontSize: '0.9em' }}>
                  {t('settings.profile.emailChange.enterCode')}
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    style={{
                      width: '150px',
                      padding: '12px 16px',
                      border: isDark ? '2px solid rgba(255,255,255,0.3)' : '2px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '1.2rem',
                      textAlign: 'center',
                      letterSpacing: '8px',
                      background: isDark ? 'transparent' : '#ffffff',
                      color: isDark ? 'white' : '#1e293b'
                    }}
                  />
                  <button
                    onClick={verifyCode}
                    disabled={verificationCode.length !== 6 || emailChangeLoading}
                    style={{
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '12px',
                      background: verificationCode.length === 6 && !emailChangeLoading
                        ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)'
                        : '#e2e8f0',
                      color: verificationCode.length === 6 && !emailChangeLoading ? 'white' : '#64748b',
                      fontWeight: '600',
                      cursor: verificationCode.length === 6 && !emailChangeLoading ? 'pointer' : 'not-allowed',
                      opacity: emailChangeLoading ? 0.7 : 1
                    }}
                  >
                    {emailChangeLoading ? '⏳ ...' : `✓ ${t('settings.profile.emailChange.verify')}`}
                  </button>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                  <button
                    onClick={sendVerificationCode}
                    disabled={emailChangeLoading}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      background: 'transparent',
                      color: emailChangeLoading ? 'rgba(102, 126, 234, 0.5)' : '#667eea',
                      cursor: emailChangeLoading ? 'wait' : 'pointer',
                      fontSize: '0.9em'
                    }}
                  >
                    {emailChangeLoading ? '⏳ ...' : `🔄 ${t('settings.profile.emailChange.resendCode')}`}
                  </button>
                  <button
                    onClick={() => { 
                      setIsChangingEmail(false); 
                      setEmailStep('input');
                      setNewEmail(''); 
                      setVerificationCode('');
                    }}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      fontSize: '0.9em'
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </>
            )}
            
            {emailStep === 'success' && (
              <div style={{
                textAlign: 'center',
                padding: '20px'
              }}>
                <span style={{ fontSize: '3em' }}>✅</span>
                <p style={{ margin: '12px 0 0', color: '#27ae60', fontWeight: '600' }}>
                  {t('settings.profile.emailChange.success')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <SaveButton section="profil" />
    </div>
  );
  
  // ===== SECTION ABONNEMENT (3 plans: Discovery, Essentiel, Pro) =====
  const renderAbonnement = () => {
    return (
      <div data-tooltip="subscription" style={{ padding: isMobile ? '15px 0' : '24px' }}>
        <h2 style={{ 
          fontSize: isMobile ? '1.3rem' : '1.5rem', 
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: isDark ? 'white' : '#1e293b'
        }}>
          💎 {t('settings.subscription.title')}
        </h2>
        <p style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', marginBottom: '16px', fontSize: '0.9em' }}>
          {t('settings.subscription.subtitle')}
        </p>
        
        {/* Plan actuel Banner - Dynamique selon subscriptionStatus */}
        <div style={{
          background: subscriptionStatus?.isActive 
            ? 'linear-gradient(135deg, rgba(46, 204, 113, 0.15) 0%, rgba(39, 174, 96, 0.15) 100%)'
            : 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
          border: subscriptionStatus?.isActive ? '2px solid #2ecc71' : '2px solid #667eea',
          borderRadius: '14px',
          padding: isMobile ? '12px 15px' : '14px 20px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ 
                background: subscriptionStatus?.isActive ? '#2ecc71' : '#667eea', 
                color: 'white', 
                padding: '3px 10px', 
                borderRadius: '20px',
                fontSize: '0.65em',
                fontWeight: 'bold'
              }}>
                {t('settings.subscription.currentPlan')}
              </span>
              <span style={{ fontSize: isMobile ? '0.95em' : '1em', fontWeight: '600', color: 'white' }}>
                {subscriptionStatus?.isActive ? (
                  <>💪 {subscriptionStatus.planName || 'Essentiel'} 
                    {subscriptionStatus.isBetaFounder && (
                      <span style={{ 
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.7em',
                        marginLeft: '8px'
                      }}>
                        ⭐ Beta Founder
                      </span>
                    )}
                  </>
                ) : (
                  <>🌱 {t('settings.subscription.discovery.name')} ({t('settings.badges.free')})</>
                )}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {subscriptionStatus?.isActive ? (
                <>
                  <span style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.7)' }}>
                    Renouvellement: {new Date(subscriptionStatus.currentPeriodEnd).toLocaleDateString()}
                  </span>
                  <button
                    onClick={handleOpenPortal}
                    disabled={stripeLoading}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '0.85em',
                      cursor: stripeLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {stripeLoading ? (
                      <span style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    ) : (
                      '⚙️'
                    )}
                    Gérer mon abonnement
                  </button>
                </>
              ) : (
                <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#667eea' }}>
                  {t('settings.subscription.discovery.price')}{t('settings.subscription.perMonth')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3 Plans Grid - Vertical scroll sur mobile */}
        <div style={{ 
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : undefined,
          gridTemplateColumns: isMobile ? undefined : 'repeat(3, 1fr)', 
          gap: isMobile ? '20px' : '12px',
          alignItems: 'start'
        }}>
          
          {/* ========== PLAN GRATUIT (Discovery) ========== */}
          <div style={{
            border: '3px solid #667eea',
            borderRadius: '16px',
            padding: '16px',
            position: 'relative',
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)',
            width: isMobile ? '100%' : 'auto'
          }}>
            <span style={{
              position: 'absolute',
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#667eea',
              color: 'white',
              padding: '3px 12px',
              borderRadius: '20px',
              fontSize: '0.65em',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}>
              ✓ {t('settings.badges.current')}
            </span>
            
            <div style={{ textAlign: 'center', marginTop: '6px', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.8em' }}>🌱</span>
              <h4 style={{ margin: '4px 0 2px', fontSize: '1.1em', color: isDark ? 'white' : '#1e293b' }}>{t('settings.subscription.discovery.name')}</h4>
              <p style={{ margin: 0, fontSize: '0.7em', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b', fontStyle: 'italic' }}>
                {t('settings.subscription.discovery.tagline')}
              </p>
              <p style={{ margin: '8px 0 0' }}>
                <span style={{ fontSize: '1.5em', fontWeight: 'bold', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>{t('settings.subscription.discovery.price')}</span>
                <span style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#94a3b8', fontSize: '0.8em' }}>{t('settings.subscription.perMonth')}</span>
              </p>
            </div>
            
            {/* Features Gratuit */}
            <div style={{ fontSize: '1em' }}>
              <p style={{ fontWeight: '600', color: isDark ? 'white' : '#1e293b', margin: '0 0 6px', fontSize: '1em' }}>🛤️ {t('settings.subscription.features.navigation')}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px', color: isDark ? 'white' : '#1e293b' }}>
                <li style={{ padding: '3px 0' }}>✓ {t('settings.subscription.features.dailyJourney')}</li>
                <li style={{ padding: '3px 0' }}>✓ {t('settings.subscription.features.navigation90')}</li>
                <li style={{ padding: '3px 0' }}>✓ {t('settings.subscription.features.maxAccounts', { count: 3 })}</li>
              </ul>
              
              <p style={{ fontWeight: '600', color: isDark ? 'white' : '#1e293b', margin: '0 0 6px', fontSize: '1em' }}>🎯 {t('settings.subscription.features.management')}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px', color: isDark ? 'white' : '#1e293b' }}>
                <li style={{ padding: '3px 0' }}>✓ {t('settings.subscription.features.maxDestinations', { count: 2 })}</li>
                <li style={{ padding: '3px 0' }}>✓ {t('settings.subscription.features.maxBudgets', { count: 10 })}</li>
                <li style={{ padding: '3px 0' }}>✓ {t('settings.subscription.features.simPerMonth', { count: 3 })}</li>
              </ul>
              
            </div>
            
            <button
              disabled
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: '#e2e8f0',
                color: '#64748b',
                fontWeight: '600',
                fontSize: '0.85em',
                marginTop: '12px',
                cursor: 'default'
              }}
            >
              {t('settings.subscription.currentButton')}
            </button>
          </div>

          {/* ========== PLAN ESSENTIEL ========== */}
          <div style={{
            border: '3px solid #f59e0b',
            borderRadius: '16px',
            padding: '16px',
            position: 'relative',
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)',
            transform: isMobile ? 'none' : 'scale(1.02)',
            boxShadow: '0 6px 25px rgba(245, 158, 11, 0.2)',
            width: isMobile ? '100%' : 'auto'
          }}>
            <span style={{
              position: 'absolute',
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              padding: '3px 12px',
              borderRadius: '20px',
              fontSize: '0.65em',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}>
              ⭐ {t('settings.badges.popular')}
            </span>
            
            <div style={{ textAlign: 'center', marginTop: '6px', marginBottom: '10px' }}>
              <span style={{ fontSize: '1.8em' }}>💎</span>
              <h4 style={{ margin: '4px 0 2px', fontSize: '1.1em', color: isDark ? 'white' : '#1e293b' }}>{t('settings.subscription.essential.name')}</h4>
              <p style={{ margin: 0, fontSize: '0.7em', color: '#667eea', fontStyle: 'italic' }}>
                {t('settings.subscription.essential.tagline')}
              </p>
              <p style={{ margin: '8px 0 0' }}>
                <span style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#667eea' }}>{t('settings.subscription.essential.price')}</span>
                <span style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b', fontSize: '0.8em' }}>{t('settings.subscription.perMonth')}</span>
              </p>
            </div>
            
            {/* Premiers Utilisateurs / Early Adopters Badge */}
            <div 
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(217, 119, 6, 0.3) 100%)',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '12px',
                textAlign: 'center'
              }}
            >
              <p style={{ margin: '0 0 8px', fontWeight: '700', color: isDark ? '#f59e0b' : '#b45309', fontSize: '1.05em' }}>
                🎁 {t('settings.subscription.beta.title')}
              </p>
              <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '0.95em', color: isDark ? '#fbbf24' : '#92400e' }}>
                🎉 {t('settings.subscription.beta.limitedOffer')}
              </p>
              <p style={{ margin: 0, fontSize: '0.9em', lineHeight: '1.4', color: isDark ? '#fbbf24' : '#92400e' }}>
                {t('settings.subscription.beta.description')}
              </p>
            </div>
            
            {/* Prix annuel - après la section Beta */}
            <p style={{ 
              margin: '0 0 12px', 
              fontSize: '0.85em', 
              color: '#2ecc71',
              background: 'rgba(46, 204, 113, 0.2)',
              padding: '3px 8px',
              borderRadius: '6px',
              display: 'inline-block',
              textAlign: 'center',
              width: '100%'
            }}>
              💰 {t('settings.subscription.orYearlyEssential', { price: t('settings.subscription.essential.yearlyPrice') })}
            </p>
            
            {/* Features Essentiel */}
            <div style={{ fontSize: '0.9em' }}>
              <p style={{ fontWeight: '600', color: '#667eea', margin: '0 0 6px', fontSize: '1em' }}>🛤️ {t('settings.subscription.features.gpsComplete')}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px', color: isDark ? 'white' : '#1e293b' }}>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.multiYear')}</li>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.allViews')}</li>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.timeline')}</li>
              </ul>
              
              <p style={{ fontWeight: '600', color: '#667eea', margin: '0 0 6px', fontSize: '1em' }}>♾️ {t('settings.subscription.features.unlimited')}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px', color: isDark ? 'white' : '#1e293b' }}>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.unlimitedAccounts')}</li>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.unlimitedDestinations')}</li>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.unlimitedSims')}</li>
              </ul>
              
              <p style={{ fontWeight: '600', color: '#667eea', margin: '0 0 6px', fontSize: '1em' }}>📊 {t('settings.subscription.features.advancedTrajectory')}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px', color: isDark ? 'white' : '#1e293b' }}>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.fullPath')}</li>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.smartAlerts')}</li>
              </ul>
              
            </div>
            
            <button
              onClick={() => handleStripeCheckout(STRIPE_PRICES.ESSENTIAL_BETA, true)}
              disabled={stripeLoading || subscriptionStatus?.isActive}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: stripeLoading ? 'rgba(102, 126, 234, 0.5)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontWeight: '600',
                fontSize: '0.85em',
                marginTop: '10px',
                cursor: stripeLoading || subscriptionStatus?.isActive ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!stripeLoading && !subscriptionStatus?.isActive) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {stripeLoading ? (
                <>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Chargement...
                </>
              ) : subscriptionStatus?.isActive ? (
                '✓ Abonné'
              ) : (
                <>🚀 {t('settings.subscription.upgradeButton')}</>
              )}
            </button>
            
            <p style={{ 
              textAlign: 'center', 
              margin: '8px 0 0', 
              fontSize: '1.2em', 
              fontWeight: 'bold',
              color: '#16a34a' 
            }}>
              ✅ {t('settings.subscription.trial')}
            </p>
          </div>

          {/* ========== PLAN PRO + IA ========== */}
          <div style={{
            border: '2px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '16px',
            padding: '16px',
            position: 'relative',
            background: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
            opacity: 0.95,
            width: isMobile ? '100%' : 'auto'
          }}>
            <span style={{
              position: 'absolute',
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              padding: '3px 12px',
              borderRadius: '20px',
              fontSize: '0.65em',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}>
              🔮 {t('settings.badges.soon')}
            </span>
            
            <div style={{ textAlign: 'center', marginTop: '6px', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.8em' }}>🤖</span>
              <h4 style={{ margin: '4px 0 2px', fontSize: '1.1em', color: isDark ? 'white' : '#1e293b' }}>{t('settings.subscription.pro.name')}</h4>
              <p style={{ margin: 0, fontSize: '0.7em', color: '#a78bfa', fontStyle: 'italic' }}>
                {t('settings.subscription.pro.tagline')}
              </p>
              <p style={{ margin: '8px 0 0' }}>
                <span style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#a78bfa' }}>{t('settings.subscription.pro.price')}</span>
                <span style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#94a3b8', fontSize: '0.8em' }}>{t('settings.subscription.perMonth')}</span>
              </p>
              <p style={{ 
                margin: '4px 0 0', 
                fontSize: '0.85em', 
                color: '#2ecc71',
                background: 'rgba(46, 204, 113, 0.2)',
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'inline-block'
              }}>
                💰 {t('settings.subscription.orYearlyPro', { price: t('settings.subscription.pro.yearlyPrice') })}
              </p>
            </div>
            
            {/* Features Pro */}
            <div style={{ fontSize: '0.9em' }}>
              <p style={{ 
                fontWeight: '600', 
                color: '#a78bfa', 
                margin: '0 0 10px', 
                fontSize: '1em',
                background: 'rgba(139, 92, 246, 0.2)',
                padding: '6px 10px',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                🎁 {t('settings.subscription.features.essentialIncluded')}
              </p>
              
              {/* Features Essentiel incluses */}
              <p style={{ fontWeight: '600', color: '#8b5cf6', margin: '0 0 4px', fontSize: '1em' }}>🛤️ {t('settings.subscription.features.gpsComplete')}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 8px', color: isDark ? 'white' : '#1e293b' }}>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.multiYear')}</li>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.allViews')}</li>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.timeline')}</li>
              </ul>
              
              <p style={{ fontWeight: '600', color: '#8b5cf6', margin: '0 0 4px', fontSize: '1em' }}>♾️ {t('settings.subscription.features.unlimited')}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 8px', color: isDark ? 'white' : '#1e293b' }}>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.unlimitedAccounts')}</li>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.unlimitedDestinations')}</li>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.unlimitedSims')}</li>
              </ul>
              
              <p style={{ fontWeight: '600', color: '#8b5cf6', margin: '0 0 4px', fontSize: '1em' }}>📊 {t('settings.subscription.features.advancedTrajectory')}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 8px', color: isDark ? 'white' : '#1e293b' }}>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.fullPath')}</li>
                <li style={{ padding: '2px 0' }}>✨ {t('settings.subscription.features.smartAlerts')}</li>
              </ul>
              
              
              {/* Features exclusives Pro */}
              <div style={{ borderTop: '2px solid #c4b5fd', paddingTop: '10px', marginTop: '6px' }}>
                <p style={{ fontWeight: '700', color: '#c4b5fd', margin: '0 0 8px', fontSize: '1em' }}>✨ {t('settings.subscription.features.exclusivePro')}</p>
                
                <p style={{ fontWeight: '600', color: isDark ? 'white' : '#1e293b', margin: '0 0 4px', fontSize: '1em' }}>🤖 {t('settings.subscription.features.aiCoach')}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 8px', color: isDark ? 'white' : '#1e293b' }}>
                  <li style={{ padding: '2px 0' }}>🔮 {t('settings.subscription.features.personalReco')}</li>
                  <li style={{ padding: '2px 0' }}>🔮 {t('settings.subscription.features.predictiveAlerts')}</li>
                  <li style={{ padding: '2px 0' }}>🔮 {t('settings.subscription.features.vocalCoach')}</li>
                </ul>
                
                <p style={{ fontWeight: '600', color: isDark ? 'white' : '#1e293b', margin: '0 0 4px', fontSize: '1em' }}>🛤️ {t('settings.subscription.features.smartRoutes')}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 8px', color: isDark ? 'white' : '#1e293b' }}>
                  <li style={{ padding: '2px 0' }}>🔮 {t('settings.subscription.features.autoOptimization')}</li>
                  <li style={{ padding: '2px 0' }}>🔮 {t('settings.subscription.features.smartRecalc')}</li>
                </ul>
                
              </div>
            </div>
            
            <button
              disabled
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                border: '2px solid #8b5cf6',
                background: 'rgba(139, 92, 246, 0.1)',
                color: '#a78bfa',
                fontWeight: '600',
                fontSize: '0.85em',
                marginTop: '10px',
                cursor: 'not-allowed'
              }}
            >
              {t('settings.subscription.soonButton')}
            </button>
            
            {/* Waitlist */}
            <div style={{
              marginTop: '10px',
              padding: '8px',
              background: 'rgba(139, 92, 246, 0.15)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ margin: '0 0 6px', fontSize: '0.65em', color: '#a78bfa', fontWeight: '600' }}>
                📧 {t('settings.subscription.waitlist')}
              </p>
              <input
                type="email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder={t('settings.subscription.waitlistPlaceholder')}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '6px',
                  fontSize: '0.7em',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white'
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Garanties */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(46, 204, 113, 0.15)',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'center',
          alignItems: isMobile ? 'center' : undefined,
          gap: isMobile ? '8px' : '24px',
          flexWrap: 'wrap'
        }}>
          <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.8em' }}>
            ✅ {t('settings.subscription.guarantees.cancel')}
          </span>
          <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.8em' }}>
            ✅ {t('settings.subscription.guarantees.noCommitment')}
          </span>
          <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.8em' }}>
            ✅ {t('settings.subscription.guarantees.exportable')}
          </span>
        </div>
      </div>
    );
  };
  
  // ===== SECTION PRÉFÉRENCES (Sans Vue GPS et Format monétaire) =====
  const renderPreferences = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ 
        fontSize: '1.75rem', 
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: isDark ? 'white' : '#1e293b'
      }}>
        🎨 {t('settings.preferences.title')}
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '400px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px', color: isDark ? 'rgba(255,255,255,0.9)' : '#4a5568' }}>
            {t('settings.preferences.language')}
          </label>
          {/* Toggle FR/EN style Header */}
          <div style={{
            display: 'inline-flex',
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderRadius: '25px',
            padding: '4px',
            border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)'
          }}>
            <button
              onClick={() => {
                i18n.changeLanguage('fr');
                localStorage.setItem('pl4to_language', 'fr');
                setPreferences({...preferences, language: 'fr'});
                trackLanguageChanged('fr');
              }}
              style={{
                padding: '10px 24px',
                borderRadius: '20px',
                border: 'none',
                background: i18n.language === 'fr' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'transparent',
                color: i18n.language === 'fr' ? 'white' : (isDark ? 'rgba(255,255,255,0.7)' : '#64748b'),
                fontWeight: i18n.language === 'fr' ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '1rem'
              }}
            >
              Français
            </button>
            <button
              onClick={() => {
                i18n.changeLanguage('en');
                localStorage.setItem('pl4to_language', 'en');
                setPreferences({...preferences, language: 'en'});
                trackLanguageChanged('en');
              }}
              style={{
                padding: '10px 24px',
                borderRadius: '20px',
                border: 'none',
                background: i18n.language === 'en' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'transparent',
                color: i18n.language === 'en' ? 'white' : (isDark ? 'rgba(255,255,255,0.7)' : '#64748b'),
                fontWeight: i18n.language === 'en' ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '1rem'
              }}
            >
              English
            </button>
          </div>
        </div>
        
        {/* Toggle Thème Dark/Light */}
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px', color: isDark ? 'rgba(255,255,255,0.9)' : '#1e293b' }}>
            {t('settings.preferences.theme', 'Thème')}
          </label>
          <div style={{
            display: 'inline-flex',
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderRadius: '25px',
            padding: '4px',
            border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)'
          }}>
            <button
              onClick={() => { setTheme('dark'); trackThemeChanged('dark'); }}
              style={{
                padding: '10px 24px',
                borderRadius: '20px',
                border: 'none',
                background: themePreference === 'dark' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'transparent',
                color: themePreference === 'dark' ? 'white' : (isDark ? 'rgba(255,255,255,0.7)' : '#64748b'),
                fontWeight: themePreference === 'dark' ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🌙 {t('settings.preferences.dark', 'Sombre')}
            </button>
            <button
              onClick={() => { setTheme('light'); trackThemeChanged('light'); }}
              style={{
                padding: '10px 24px',
                borderRadius: '20px',
                border: 'none',
                background: themePreference === 'light' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'transparent',
                color: themePreference === 'light' ? 'white' : (isDark ? 'rgba(255,255,255,0.7)' : '#64748b'),
                fontWeight: themePreference === 'light' ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ☀️ {t('settings.preferences.light', 'Clair')}
            </button>
            <button
              onClick={() => { setTheme('auto'); trackThemeChanged('auto'); }}
              style={{
                padding: '10px 24px',
                borderRadius: '20px',
                border: 'none',
                background: themePreference === 'auto' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'transparent',
                color: themePreference === 'auto' ? 'white' : (isDark ? 'rgba(255,255,255,0.7)' : '#64748b'),
                fontWeight: themePreference === 'auto' ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🌗 {t('settings.preferences.themeOptions.auto', 'Auto')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  
  // ===== SECTION NOTIFICATIONS (Avec Améliorer parcours + choix jour) =====
  const renderNotifications = () => {
    const joursOptions = [
      { value: 'lundi', label: t('settings.notifications.days.monday') },
      { value: 'mardi', label: t('settings.notifications.days.tuesday') },
      { value: 'mercredi', label: t('settings.notifications.days.wednesday') },
      { value: 'jeudi', label: t('settings.notifications.days.thursday') },
      { value: 'vendredi', label: t('settings.notifications.days.friday') },
      { value: 'samedi', label: t('settings.notifications.days.saturday') },
      { value: 'dimanche', label: t('settings.notifications.days.sunday') }
    ];
    
    const ToggleItem = ({ icon, label, description, checked, onChange, children }) => (
      <div style={{
        padding: '16px',
        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.03)',
        borderRadius: '12px',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)'
      }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            style={{
              width: '22px',
              height: '22px',
              cursor: 'pointer',
              accentColor: '#667eea'
            }}
          />
          <span style={{ fontSize: '1.2em' }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: '500', color: isDark ? 'white' : '#1e293b' }}>{label}</span>
            <small style={{ display: 'block', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b', fontSize: '0.85em' }}>{description}</small>
          </div>
        </label>
        {children}
      </div>
    );
    
    return (
      <div style={{ padding: '24px' }}>
        <h2 style={{ 
          fontSize: '1.75rem', 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: isDark ? 'white' : '#1e293b'
        }}>
          🔔 {t('settings.notifications.title')}
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px' }}>
          <ToggleItem
            icon="📧"
            label={t('settings.notifications.email.label')}
            description={t('settings.notifications.email.description')}
            checked={notifications.emailAlerts}
            onChange={(val) => setNotifications({...notifications, emailAlerts: val})}
          />
          
          <ToggleItem
            icon="🔔"
            label={t('settings.notifications.push.label')}
            description={t('settings.notifications.push.description')}
            checked={notifications.pushNotifications}
            onChange={(val) => setNotifications({...notifications, pushNotifications: val})}
          />
          
          <ToggleItem
            icon="⚠️"
            label={t('settings.notifications.alerts.label')}
            description={t('settings.notifications.alerts.description')}
            checked={notifications.parcoursAlerts}
            onChange={(val) => setNotifications({...notifications, parcoursAlerts: val})}
          />
          
          <ToggleItem
            icon="🧭"
            label={t('settings.notifications.milestones.label')}
            description={t('settings.notifications.milestones.description')}
            checked={notifications.milestones}
            onChange={(val) => setNotifications({...notifications, milestones: val})}
          />
          
          <ToggleItem
            icon="🚀"
            label={t('settings.notifications.improvements.label')}
            description={t('settings.notifications.improvements.description')}
            checked={notifications.ameliorationParcours}
            onChange={(val) => setNotifications({...notifications, ameliorationParcours: val})}
          >
            {notifications.ameliorationParcours && (
              <div style={{ 
                marginTop: '12px', 
                marginLeft: '46px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ color: '#64748b', fontSize: '0.9em' }}>{t('settings.notifications.receiveEvery')}</span>
                <select
                  value={notifications.ameliorationJour}
                  onChange={(e) => setNotifications({...notifications, ameliorationJour: e.target.value})}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9em',
                    cursor: 'pointer'
                  }}
                >
                  {joursOptions.map(jour => (
                    <option key={jour.value} value={jour.value}>{jour.label}</option>
                  ))}
                </select>
              </div>
            )}
          </ToggleItem>
        </div>
        
        <SaveButton section="notifications" />
      </div>
    );
  };
  
  // ===== SECTION SÉCURITÉ =====
  const renderSecurite = () => (
    <div data-tooltip="security" style={{ padding: isMobile ? '15px 0' : '24px' }}>
      <h2 style={{ 
        fontSize: isMobile ? '1.3rem' : '1.5rem', 
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: isDark ? 'white' : '#1e293b'
      }}>
        🔒 {t('settings.security.title')}
      </h2>
      
      <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : undefined, gridTemplateColumns: isMobile ? undefined : '1fr 1fr', gap: '16px' }}>
        {/* Mot de passe */}
        <div style={{
          padding: '20px',
          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)',
          borderRadius: '12px',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ fontSize: '1.3em' }}>🔑</span>
            <h3 style={{ margin: 0, color: isDark ? 'white' : '#1e293b', fontSize: '1.1em' }}>{t('settings.security.password.title')}</h3>
          </div>
          <p style={{ margin: '0 0 12px', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', fontSize: '0.9em' }}>
            {t('settings.security.password.lastChange', { days: 23 })}
          </p>
          <button style={{
            padding: '10px 20px',
            border: '2px solid #667eea',
            borderRadius: '10px',
            background: 'transparent',
            color: '#667eea',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            {t('settings.security.password.change')}
          </button>
        </div>
        
        {/* 2FA */}
        <div style={{
          padding: '20px',
          background: twoFAStatus.enabled ? 'rgba(46, 204, 113, 0.1)' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)',
          borderRadius: '12px',
          border: twoFAStatus.enabled ? '2px solid rgba(46, 204, 113, 0.3)' : isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ fontSize: '1.3em' }}>🛡️</span>
            <h3 style={{ margin: 0, color: isDark ? 'white' : '#1e293b', fontSize: '1.1em' }}>{t('settings.security.twoFactor.title')}</h3>
            <span style={{ 
              fontSize: '0.75em', 
              padding: '3px 10px', 
              borderRadius: '12px',
              background: twoFAStatus.enabled ? 'rgba(46, 204, 113, 0.2)' : 'rgba(255, 165, 0, 0.2)',
              color: twoFAStatus.enabled ? '#2ecc71' : '#ffa500',
              fontWeight: '600'
            }}>
              {twoFAStatus.enabled ? t('settings.security.twoFactor.enabled') : t('settings.security.twoFactor.disabled')}
            </span>
          </div>
          <p style={{ margin: '0 0 12px', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', fontSize: '0.9em' }}>
            {t('settings.security.twoFactor.description')}
          </p>
          
          {/* Afficher le nombre de codes backup restants si 2FA activé */}
          {twoFAStatus.enabled && (
            <p style={{ 
              margin: '0 0 12px', 
              color: twoFAStatus.backupCodesRemaining <= 2 ? '#ffa500' : isDark ? 'rgba(255,255,255,0.6)' : '#64748b', 
              fontSize: '0.85em' 
            }}>
              🔑 {t('settings.security.twoFactor.backupCodesRemaining', { count: twoFAStatus.backupCodesRemaining })}
            </p>
          )}
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {twoFAStatus.enabled ? (
              <>
                <button 
                  onClick={() => {
                    setTwoFAError(null);
                    setShow2FADisableModal(true);
                  }}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '10px',
                    background: '#ef4444',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {t('settings.security.twoFactor.disable')}
                </button>
                <button 
                  onClick={() => {
                    setTwoFAError(null);
                    setTwoFACode('');
                    setShow2FABackupModal(true);
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '2px solid #667eea',
                    borderRadius: '10px',
                    background: 'transparent',
                    color: '#667eea',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🔑 {t('settings.security.twoFactor.regenerateBackup')}
                </button>
              </>
            ) : (
              <button 
                onClick={handleSetup2FA}
                disabled={twoFALoading}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '10px',
                  background: twoFALoading ? 'rgba(102, 126, 234, 0.5)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: '600',
                  cursor: twoFALoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {twoFALoading && (
                  <span style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                )}
                {t('settings.security.twoFactor.enable')}
              </button>
            )}
          </div>
          
          {/* Erreur 2FA */}
          {twoFAError && (
            <p style={{ margin: '12px 0 0', color: '#ef4444', fontSize: '0.9em' }}>
              ❌ {twoFAError}
            </p>
          )}
        </div>
      </div>
      
      {/* Sessions actives */}
      <div style={{
        marginTop: '16px',
        padding: isMobile ? '16px' : '20px',
        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)',
        borderRadius: '12px',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ fontSize: '1.3em' }}>📱</span>
          <h3 style={{ margin: 0, color: isDark ? 'white' : '#1e293b', fontSize: '1.1em' }}>{t('settings.security.sessions.title')}</h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            padding: '12px 16px',
            background: 'rgba(46, 204, 113, 0.15)',
            borderRadius: '10px',
            border: '2px solid #27ae60',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: '600', color: isDark ? 'white' : '#1e293b', fontSize: '0.95em' }}>💻 Chrome - Windows</p>
              <small style={{ color: '#2ecc71', fontSize: '0.8em' }}>{t('settings.security.sessions.current')}</small>
            </div>
          </div>
          
          <div style={{
            padding: '12px 16px',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderRadius: '10px',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: '600', color: isDark ? 'white' : '#1e293b', fontSize: '0.95em' }}>📱 Safari - iPhone</p>
              <small style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b', fontSize: '0.8em' }}>{t('settings.security.sessions.ago', { time: '2 jours' })}</small>
            </div>
            <button style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '8px',
              background: 'rgba(255, 165, 0, 0.2)',
              color: '#ffa500',
              fontSize: '0.8em',
              cursor: 'pointer'
            }}>
              {t('settings.security.sessions.disconnect')}
            </button>
          </div>
        </div>
        
        <button 
          disabled={logoutAllLoading}
          onClick={async () => {
            setLogoutAllLoading(true);
            try {
              // Récupérer le token depuis le bon emplacement
              const tokenData = localStorage.getItem('gps_financier_token');
              const token = tokenData ? JSON.parse(tokenData) : null;
              
              if (!token) {
                alert('Session expirée. Veuillez vous reconnecter.');
                return;
              }
              
              const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout-all-sessions`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              const data = await response.json();
              
              if (data.success) {
                // Remplacer le token par le nouveau (même format JSON)
                if (data.newToken) {
                  localStorage.setItem('gps_financier_token', JSON.stringify(data.newToken));
                }
                setShowLogoutSuccessModal(true);
              } else {
                alert(data.error || 'Erreur lors de la déconnexion');
              }
            } catch (error) {
              console.error('Erreur:', error);
              alert('Erreur de connexion au serveur');
            } finally {
              setLogoutAllLoading(false);
            }
          }}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '10px',
            background: logoutAllLoading ? 'rgba(255, 165, 0, 0.5)' : 'linear-gradient(135deg, #ffa500 0%, #e67e22 100%)',
            color: 'white',
            fontWeight: '600',
            cursor: logoutAllLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.9em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {logoutAllLoading && (
            <span style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}
          {logoutAllLoading ? 'Déconnexion...' : t('settings.security.sessions.disconnectAll')}
        </button>
      </div>
      
      {/* Données sensibles */}
      <div style={{
        marginTop: '16px',
        padding: '20px',
        background: security.hideBalances ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)',
        borderRadius: '12px',
        border: security.hideBalances ? '2px solid #667eea' : isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '1.3em' }}>🔐</span>
          <h3 style={{ margin: 0, color: isDark ? 'white' : '#1e293b', fontSize: '1.1em' }}>{t('settings.security.sensitiveData.title')}</h3>
        </div>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          cursor: 'pointer',
          padding: '12px',
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderRadius: '10px'
        }}>
          <input
            type="checkbox"
            checked={security.hideBalances}
            onChange={(e) => setSecurity({...security, hideBalances: e.target.checked})}
            style={{ width: '22px', height: '22px', accentColor: '#667eea', cursor: 'pointer' }}
          />
          <div>
            <span style={{ color: isDark ? 'white' : '#1e293b', fontWeight: '500' }}>{t('settings.security.sensitiveData.hideBalances')}</span>
            <small style={{ display: 'block', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b', fontSize: '0.85em' }}>
              {t('settings.security.sensitiveData.hideBalancesDescription')}
            </small>
          </div>
        </label>
      </div>
      
      {/* 🗑️ Supprimer mon compte */}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '12px',
        border: '2px solid rgba(239, 68, 68, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '1.3em' }}>🗑️</span>
          <h3 style={{ margin: 0, color: '#ef4444', fontSize: '1.1em' }}>{t('settings.security.deleteAccount.title')}</h3>
        </div>
        <p style={{ margin: '0 0 16px', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', fontSize: '0.9em' }}>
          {t('settings.security.deleteAccount.warning')}
        </p>
        <button 
          onClick={() => setShowDeleteAccountModal(true)}
          style={{
            padding: '12px 24px',
            border: '2px solid #ef4444',
            borderRadius: '10px',
            background: 'transparent',
            color: '#ef4444',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ef4444';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#ef4444';
          }}
        >
          {t('settings.security.deleteAccount.button')}
        </button>
      </div>
    </div>
  );
  
  // ===== SECTION À PROPOS (Logo seul, sans version ni crédits) =====
  const renderAPropos = () => (
    <div style={{ padding: isMobile ? '16px 0' : '24px' }}>
      <h2 style={{ 
        fontSize: '1.75rem', 
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: isDark ? 'white' : '#1e293b'
      }}>
        ℹ️ {t('settings.about.title')}
      </h2>
      
      {/* Logo Pl4to avec fond sombre */}
      <div style={{
        textAlign: 'center',
        padding: '40px',
        background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.03)',
        borderRadius: '20px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '16px'
        }}>
          <span style={{ 
            fontSize: '3em', 
            fontWeight: 'bold',
            color: isDark ? '#e8eaf6' : '#1e3a8a'
          }}>
            PL4T
          </span>
          {/* O animé style Anneau - identique au Sidebar */}
          <div style={{
            position: 'relative',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              position: 'absolute',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: '5px solid transparent',
              background: isDark 
                ? 'linear-gradient(#050530, #050530) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box'
                : 'linear-gradient(#ffffff, #ffffff) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box',
              animation: 'logoSpin 3s linear infinite',
              boxShadow: '0 0 20px rgba(255, 165, 0, 0.6)'
            }} />
          </div>
        </div>
        <p style={{ 
          margin: 0, 
          fontSize: '1.2em', 
          color: isDark ? 'white' : '#1e293b'
        }}>
          {t('settings.about.tagline')}
        </p>
      </div>
      
      {/* Liens utiles */}
      <div style={{
        padding: isMobile ? '16px' : '24px',
        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        marginBottom: '20px',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ margin: '0 0 16px', color: isDark ? 'white' : '#1e293b', fontSize: '1.1em' }}>{t('settings.about.links.title')}</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
          gap: isMobile ? '10px' : '12px' 
        }}>
          {[
            { icon: '📖', label: t('settings.about.links.guide'), modal: 'guide' },
            { icon: '❓', label: t('settings.about.links.faq'), modal: 'faq' },
            { icon: '📝', label: t('settings.about.links.versions'), modal: 'versions' },
            { icon: '📧', label: t('settings.about.links.contact'), modal: 'contact' },
            { icon: '⚖️', label: t('settings.about.links.legal'), modal: 'legal' },
            { icon: '🔒', label: t('settings.about.links.privacy'), modal: 'privacy' }
          ].map((link, idx) => (
            <button
              key={idx}
              onClick={() => setActiveModal(link.modal)}
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isMobile ? '6px' : '8px',
                padding: isMobile ? '12px 8px' : '14px 16px',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                borderRadius: '12px',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                color: isDark ? 'white' : '#1e293b',
                fontSize: isMobile ? '0.85em' : '1em',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minHeight: isMobile ? '70px' : 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
              }}
            >
              <span style={{ fontSize: isMobile ? '1.3em' : '1em' }}>{link.icon}</span>
              <span style={{ textAlign: 'center', lineHeight: '1.2' }}>{link.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Réseaux sociaux - CACHÉ POUR LE LANCEMENT
      <div style={{
        padding: isMobile ? '16px' : '24px',
        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        marginBottom: '20px',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ margin: '0 0 16px', color: isDark ? 'white' : '#1e293b', fontSize: '1.1em' }}>{t('settings.about.social.title')}</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
          gap: isMobile ? '10px' : '12px' 
        }}>
          {[
            { icon: <span style={{ fontWeight: 'bold', color: '#1877f2' }}>f</span>, label: 'Facebook', url: 'https://facebook.com/pl4to' },
            { icon: <span style={{ fontWeight: 'bold' }}>𝕏</span>, label: 'X', url: 'https://x.com/pl4to' },
            { icon: '📷', label: 'Instagram', url: 'https://instagram.com/pl4to' },
            { icon: '💼', label: 'LinkedIn', url: 'https://linkedin.com/company/pl4to' }
          ].map((social, idx) => (
            <a
              key={idx}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: isMobile ? '12px 10px' : '12px 18px',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                borderRadius: '12px',
                textDecoration: 'none',
                color: isDark ? 'white' : '#1e293b',
                fontSize: isMobile ? '0.85em' : '0.95em',
                fontWeight: '500',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '1.1em' }}>{social.icon}</span>
              <span>{social.label}</span>
            </a>
          ))}
        </div>
      </div>
      */}
      
      {/* Feedback */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        gap: '12px', 
        justifyContent: 'center',
        padding: isMobile ? '0 16px' : '0'
      }}>
        <button 
          onClick={() => {
            setBugForm({...bugForm, type: 'feedback'});
            setActiveModal('bug');
          }}
          style={{
            padding: isMobile ? '14px 20px' : '12px 24px',
            border: '2px solid #667eea',
            borderRadius: '12px',
            background: 'transparent',
            color: '#667eea',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: isMobile ? '0.9em' : '0.95em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            maxWidth: '300px',
            margin: '0 auto'
          }}
        >
          <span>💬</span>
          {t('settings.about.feedback.beta')}
        </button>
      </div>
      
      <style>{`
        @keyframes logoSpin {
          0% { transform: rotate(0deg); box-shadow: 0 0 20px rgba(255, 165, 0, 0.6); }
          50% { box-shadow: 0 0 30px rgba(255, 165, 0, 0.9); }
          100% { transform: rotate(360deg); box-shadow: 0 0 20px rgba(255, 165, 0, 0.6); }
        }
      `}</style>
      
      {/* ===== MODALS ===== */}
      {activeModal && (
        <div 
          onClick={() => setActiveModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDark ? 'linear-gradient(180deg, #040449 0%, #100261 100%)' : '#ffffff',
              borderRadius: '20px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: isDark ? 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)' : 'linear-gradient(135deg, #667eea10 0%, #764ba210 100%)'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.4em', color: isDark ? 'white' : '#1e293b' }}>
                {activeModal === 'guide' && t('settings.about.modals.guide.title')}
                {activeModal === 'faq' && t('settings.about.modals.faq.title')}
                {activeModal === 'versions' && t('settings.about.modals.versions.title')}
                {activeModal === 'contact' && t('settings.about.modals.contact.title')}
                {activeModal === 'legal' && t('settings.about.modals.legal.title')}
                {activeModal === 'privacy' && t('settings.about.modals.privacy.title')}
                {activeModal === 'bug' && (bugForm.type === 'feedback' ? '💬 Envoyer un feedback' : t('settings.about.modals.bug.title'))}
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                style={{
                  background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                  border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1.3em',
                  color: isDark ? 'white' : '#1e293b'
                }}
              >
                ✕
              </button>
            </div>
            
            {/* Modal Content */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              
              {/* ===== GUIDE UTILISATEUR ===== */}
              {activeModal === 'guide' && (
                <div style={{ lineHeight: '1.7', color: isDark ? 'white' : '#1e293b' }}>
                  <p style={{ fontSize: '1.1em', color: '#667eea', fontWeight: '500', marginTop: 0 }}>
                    {t('settings.about.modals.guide.welcome')}
                  </p>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b', marginTop: '24px' }}>{t('settings.about.modals.guide.dashboard.title')}</h3>
                  <p>{t('settings.about.modals.guide.dashboard.content')}</p>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b', marginTop: '24px' }}>{t('settings.about.modals.guide.accounts.title')}</h3>
                  <p>{t('settings.about.modals.guide.accounts.content')}</p>
                  <ul style={{ paddingLeft: '20px' }}>
                    <li>{t('settings.about.modals.guide.accounts.item1')}</li>
                    <li>{t('settings.about.modals.guide.accounts.item2')}</li>
                    <li>{t('settings.about.modals.guide.accounts.item3')}</li>
                  </ul>
                  <p><strong>Astuce:</strong> {t('settings.about.modals.guide.accounts.tip')}</p>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b', marginTop: '24px' }}>{t('settings.about.modals.guide.budget.title')}</h3>
                  <p>{t('settings.about.modals.guide.budget.content')}</p>
                  <ul style={{ paddingLeft: '20px' }}>
                    <li><strong>{t('settings.about.modals.guide.budget.income')}</strong></li>
                    <li><strong>{t('settings.about.modals.guide.budget.expenses')}</strong></li>
                    <li><strong>{t('settings.about.modals.guide.budget.frequencies')}</strong></li>
                  </ul>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b', marginTop: '24px' }}>{t('settings.about.modals.guide.destinations.title')}</h3>
                  <p>{t('settings.about.modals.guide.destinations.content')}</p>
                  <ul style={{ paddingLeft: '20px' }}>
                    <li>{t('settings.about.modals.guide.destinations.item1')}</li>
                    <li>{t('settings.about.modals.guide.destinations.item2')}</li>
                    <li>{t('settings.about.modals.guide.destinations.item3')}</li>
                  </ul>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b', marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-flex',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '3px solid transparent',
                      background: `linear-gradient(${isDark ? '#040449' : '#ffffff'}, ${isDark ? '#040449' : '#ffffff'}) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box`,
                      animation: 'logoSpin 3s linear infinite',
                      boxShadow: '0 0 10px rgba(255, 165, 0, 0.5)'
                    }} />
                    {t('settings.about.modals.guide.gps.title')}
                  </h3>
                  <p>{t('settings.about.modals.guide.gps.content')}</p>
                  <ul style={{ paddingLeft: '20px' }}>
                    <li><strong>{t('settings.about.modals.guide.gps.dayView')}</strong></li>
                    <li><strong>{t('settings.about.modals.guide.gps.monthView')}</strong></li>
                    <li><strong>{t('settings.about.modals.guide.gps.yearView')}</strong></li>
                  </ul>
                  <p><strong>Astuce:</strong> {t('settings.about.modals.guide.gps.tip')}</p>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b', marginTop: '24px' }}>{t('settings.about.modals.guide.calculator.title')}</h3>
                  <p>{t('settings.about.modals.guide.calculator.content')}</p>
                  
                  <div style={{
                    marginTop: '24px',
                    padding: '16px',
                    background: 'rgba(46, 204, 113, 0.15)',
                    borderRadius: '12px',
                    border: '1px solid rgba(46, 204, 113, 0.3)'
                  }}>
                    <p style={{ margin: 0, fontWeight: '600', color: '#2ecc71' }}>
                      💡 {t('settings.about.modals.guide.helpTip')}
                    </p>
                  </div>
                </div>
              )}
              
              {/* ===== FAQ ===== */}
              {activeModal === 'faq' && (
                <div style={{ lineHeight: '1.7', color: isDark ? 'white' : '#1e293b' }}>
                  {[
                    { q: t('settings.about.modals.faq.q1'), a: t('settings.about.modals.faq.a1') },
                    { q: t('settings.about.modals.faq.q2'), a: t('settings.about.modals.faq.a2') },
                    { q: t('settings.about.modals.faq.q3'), a: t('settings.about.modals.faq.a3') },
                    { q: t('settings.about.modals.faq.q4'), a: t('settings.about.modals.faq.a4') },
                    { q: t('settings.about.modals.faq.q5'), a: t('settings.about.modals.faq.a5') },
                    { q: t('settings.about.modals.faq.q6'), a: t('settings.about.modals.faq.a6') },
                    { q: t('settings.about.modals.faq.q7'), a: t('settings.about.modals.faq.a7') },
                    { q: t('settings.about.modals.faq.q8'), a: t('settings.about.modals.faq.a8') }
                  ].map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '20px' }}>
                      <h4 style={{ 
                        color: '#667eea', 
                        margin: '0 0 8px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                      }}>
                        <span style={{ color: '#667eea' }}>Q:</span>
                        {item.q}
                      </h4>
                      <p style={{ margin: 0, paddingLeft: '24px' }}>
                        <strong style={{ color: '#2ecc71' }}>R:</strong> {item.a}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              {/* ===== NOTES DE VERSION ===== */}
              {activeModal === 'versions' && (
                <div style={{ lineHeight: '1.7', color: isDark ? 'white' : '#1e293b' }}>
                  <div style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                    borderRadius: '12px',
                    marginBottom: '24px'
                  }}>
                    <h3 style={{ margin: '0 0 8px', color: '#667eea', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-flex',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: '3px solid transparent',
                        background: `linear-gradient(${isDark ? '#040449' : '#ffffff'}, ${isDark ? '#040449' : '#ffffff'}) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box`,
                        animation: 'logoSpin 3s linear infinite',
                        boxShadow: '0 0 10px rgba(255, 165, 0, 0.5)'
                      }} />
                      {t('settings.about.modals.versions.currentVersion')}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.9em', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}>{t('settings.about.modals.versions.currentDate')}</p>
                  </div>
                  
                  <h4 style={{ color: isDark ? 'white' : '#1e293b' }}>{t('settings.about.modals.versions.newFeatures')}</h4>
                  <ul style={{ paddingLeft: '20px' }}>
                    <li>{t('settings.about.modals.versions.feature1')}</li>
                    <li>{t('settings.about.modals.versions.feature2')}</li>
                    <li>{t('settings.about.modals.versions.feature3')}</li>
                    <li>{t('settings.about.modals.versions.feature4')}</li>
                    <li>{t('settings.about.modals.versions.feature5')}</li>
                    <li>{t('settings.about.modals.versions.feature6')}</li>
                    <li>{t('settings.about.modals.versions.feature7')}</li>
                  </ul>
                  
                  <h4 style={{ color: isDark ? 'white' : '#1e293b', marginTop: '20px' }}>{t('settings.about.modals.versions.improvements')}</h4>
                  <ul style={{ paddingLeft: '20px' }}>
                    <li>{t('settings.about.modals.versions.improvement1')}</li>
                    <li>{t('settings.about.modals.versions.improvement2')}</li>
                    <li>{t('settings.about.modals.versions.improvement3')}</li>
                  </ul>
                  
                  <h4 style={{ color: isDark ? 'white' : '#1e293b', marginTop: '20px' }}>{t('settings.about.modals.versions.upcoming')}</h4>
                  <ul style={{ paddingLeft: '20px' }}>
                    <li>{t('settings.about.modals.versions.upcoming1')}</li>
                    <li>{t('settings.about.modals.versions.upcoming2')}</li>
                    <li>{t('settings.about.modals.versions.upcoming3')}</li>
                    <li>{t('settings.about.modals.versions.upcoming4')}</li>
                  </ul>
                </div>
              )}
              
              {/* ===== NOUS CONTACTER ===== */}
              {activeModal === 'contact' && (
                <div style={{ lineHeight: '1.7', color: isDark ? 'white' : '#1e293b' }}>
                  <p style={{ fontSize: '1.1em', marginTop: 0 }}>
                    {t('settings.about.modals.contact.intro')}
                  </p>
                  
                  <div style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>
                    <div style={{
                      padding: '20px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
                    }}>
                      <span style={{ fontSize: '2em' }}>📧</span>
                      <div>
                        <h4 style={{ margin: '0 0 4px', color: isDark ? 'white' : '#1e293b' }}>{t('settings.about.modals.contact.emailTitle')}</h4>
                        <a href="mailto:support@pl4to.ca" style={{ color: '#667eea', textDecoration: 'none' }}>
                          {t('settings.about.modals.contact.emailAddress')}
                        </a>
                        <p style={{ margin: '4px 0 0', fontSize: '0.9em', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}>
                          {t('settings.about.modals.contact.emailResponse')}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{
                      padding: '20px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
                    }}>
                      <span style={{ fontSize: '2em' }}>💬</span>
                      <div>
                        <h4 style={{ margin: '0 0 4px', color: isDark ? 'white' : '#1e293b' }}>{t('settings.about.modals.contact.chatTitle')}</h4>
                        <p style={{ margin: 0, color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}>{t('settings.about.modals.contact.chatStatus')}</p>
                      </div>
                    </div>
                    
                    <div style={{
                      padding: '20px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
                    }}>
                      <span style={{ fontSize: '2em' }}>🐛</span>
                      <div>
                        <h4 style={{ margin: '0 0 4px', color: isDark ? 'white' : '#1e293b' }}>{t('settings.about.modals.contact.bugTitle')}</h4>
                        <p style={{ margin: 0, fontSize: '0.9em', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}>
                          {t('settings.about.modals.contact.bugDescription')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    marginTop: '24px',
                    padding: '16px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    borderRadius: '12px',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    <p style={{ margin: 0, color: '#f59e0b' }}>
                      <strong>🌟 {t('settings.about.modals.contact.betaNote')}</strong>
                    </p>
                  </div>
                </div>
              )}
              
              {/* ===== MENTIONS LÉGALES ===== */}
              {activeModal === 'legal' && (
                <div style={{ lineHeight: '1.8', color: isDark ? 'white' : '#1e293b' }}>
                  <h3 style={{ color: isDark ? 'white' : '#1e293b' }}>{t('settings.about.modals.legal.editor.title')}</h3>
                  <p>
                    <strong>Pl4to</strong> {t('settings.about.modals.legal.editor.content')}<br />
                    {t('settings.about.modals.legal.editor.location')}<br />
                    {t('settings.about.modals.legal.editor.contact')}
                  </p>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b' }}>{t('settings.about.modals.legal.terms.title')}</h3>
                  <p>
                    {t('settings.about.modals.legal.terms.content')}
                  </p>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b' }}>{t('settings.about.modals.legal.liability.title')}</h3>
                  <p>
                    {t('settings.about.modals.legal.liability.content')}
                  </p>
                  <p>
                    <strong>{t('settings.about.modals.legal.liability.recommendation')}</strong>
                  </p>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b' }}>{t('settings.about.modals.legal.ip.title')}</h3>
                  <p>
                    {t('settings.about.modals.legal.ip.content')}
                  </p>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b' }}>{t('settings.about.modals.legal.changes.title')}</h3>
                  <p>
                    {t('settings.about.modals.legal.changes.content')}
                  </p>
                  
                  <p style={{ marginTop: '24px', fontSize: '0.9em', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}>
                    {t('settings.about.modals.legal.lastUpdate')}
                  </p>
                </div>
              )}
              
              {/* ===== CONFIDENTIALITÉ ===== */}
              {activeModal === 'privacy' && (
                <div style={{ lineHeight: '1.8', color: isDark ? 'white' : '#1e293b' }}>
                  <div style={{
                    padding: '16px',
                    background: 'rgba(46, 204, 113, 0.15)',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    border: '1px solid rgba(46, 204, 113, 0.3)'
                  }}>
                    <p style={{ margin: 0, fontWeight: '600', color: '#2ecc71' }}>
                      🔒 {t('settings.about.modals.privacy.priority')}
                    </p>
                  </div>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b' }}>{t('settings.about.modals.privacy.collected.title')}</h3>
                  <p>{t('settings.about.modals.privacy.collected.intro')}</p>
                  <ul style={{ paddingLeft: '20px' }}>
                    <li><strong>{t('settings.about.modals.privacy.collected.account')}</strong></li>
                    <li><strong>{t('settings.about.modals.privacy.collected.financial')}</strong></li>
                    <li><strong>{t('settings.about.modals.privacy.collected.technical')}</strong></li>
                  </ul>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b' }}>{t('settings.about.modals.privacy.notDone.title')}</h3>
                  <ul style={{ paddingLeft: '20px' }}>
                    <li>{t('settings.about.modals.privacy.notDone.item1')}</li>
                    <li>{t('settings.about.modals.privacy.notDone.item2')}</li>
                    <li>{t('settings.about.modals.privacy.notDone.item3')}</li>
                    <li>{t('settings.about.modals.privacy.notDone.item4')}</li>
                  </ul>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b' }}>{t('settings.about.modals.privacy.security.title')}</h3>
                  <p>
                    {t('settings.about.modals.privacy.security.intro')}
                  </p>
                  <ul style={{ paddingLeft: '20px' }}>
                    <li>{t('settings.about.modals.privacy.security.item1')}</li>
                    <li>{t('settings.about.modals.privacy.security.item2')}</li>
                    <li>{t('settings.about.modals.privacy.security.item3')}</li>
                  </ul>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b' }}>{t('settings.about.modals.privacy.rights.title')}</h3>
                  <p>{t('settings.about.modals.privacy.rights.intro')}</p>
                  <ul style={{ paddingLeft: '20px' }}>
                    <li><strong>{t('settings.about.modals.privacy.rights.access')}</strong></li>
                    <li><strong>{t('settings.about.modals.privacy.rights.modify')}</strong></li>
                    <li><strong>{t('settings.about.modals.privacy.rights.export')}</strong></li>
                    <li><strong>{t('settings.about.modals.privacy.rights.delete')}</strong></li>
                  </ul>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b' }}>{t('settings.about.modals.privacy.cookies.title')}</h3>
                  <p>
                    {t('settings.about.modals.privacy.cookies.content')}
                  </p>
                  
                  <h3 style={{ color: isDark ? 'white' : '#1e293b' }}>{t('settings.about.modals.privacy.dpo.title')}</h3>
                  <p>
                    {t('settings.about.modals.privacy.dpo.intro')}<br />
                    <a href="mailto:privacy@pl4to.ca" style={{ color: '#667eea' }}>{t('settings.about.modals.privacy.dpo.email')}</a>
                  </p>
                  
                  <p style={{ marginTop: '24px', fontSize: '0.9em', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}>
                    {t('settings.about.modals.privacy.lastUpdate')}
                  </p>
                </div>
              )}
              
              {/* ===== SIGNALER UN BUG ===== */}
              {activeModal === 'bug' && (
                <div style={{ lineHeight: '1.7', color: isDark ? 'white' : '#1e293b' }}>
                  {!bugSubmitted ? (
                    <>
                      <p style={{ fontSize: '1.1em', marginTop: 0 }}>
                        Vous avez trouvé un problème ou avez une suggestion? Faites-le nous savoir!
                      </p>
                      
                      <div style={{ marginTop: '24px' }}>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: isDark ? 'white' : '#1e293b' }}>
                          Type de signalement
                        </label>
                        <select
                          value={bugForm.type}
                          onChange={(e) => setBugForm({...bugForm, type: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid #e2e8f0',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            background: isDark ? 'rgba(255,255,255,0.05)' : 'white',
                            color: isDark ? 'white' : '#1e293b'
                          }}
                        >
                          <option value="bug">🐛 Bug / Erreur</option>
                          <option value="feedback">💬 Feedback général</option>
                          <option value="amelioration">💡 Suggestion d'amélioration</option>
                          <option value="question">❓ Question</option>
                          <option value="autre">💬 Autre</option>
                        </select>
                      </div>
                      
                      <div style={{ marginTop: '20px' }}>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: isDark ? 'white' : '#1e293b' }}>
                          Description *
                        </label>
                        <textarea
                          value={bugForm.description}
                          onChange={(e) => setBugForm({...bugForm, description: e.target.value})}
                          placeholder="Décrivez le problème ou votre suggestion en détail..."
                          rows={6}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid #e2e8f0',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            background: isDark ? 'rgba(255,255,255,0.05)' : 'white',
                            color: isDark ? 'white' : '#1e293b'
                          }}
                        />
                      </div>
                      
                      <div style={{ marginTop: '20px' }}>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: isDark ? 'white' : '#1e293b' }}>
                          Votre email (optionnel)
                        </label>
                        <input
                          type="email"
                          value={bugForm.email}
                          onChange={(e) => setBugForm({...bugForm, email: e.target.value})}
                          placeholder="Pour vous recontacter si nécessaire"
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid #e2e8f0',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            background: isDark ? 'rgba(255,255,255,0.05)' : 'white',
                            color: isDark ? 'white' : '#1e293b'
                          }}
                        />
                      </div>
                      
                      <div style={{
                        marginTop: '24px',
                        padding: '16px',
                        background: 'rgba(102, 126, 234, 0.15)',
                        borderRadius: '12px'
                      }}>
                        <p style={{ margin: 0, fontSize: '0.9em', color: 'rgba(255,255,255,0.8)' }}>
                          💡 <strong>Astuce:</strong> Pour les bugs, incluez les étapes pour reproduire le problème et ce que vous attendiez comme résultat.
                        </p>
                      </div>
                      
                      <button
                        onClick={() => {
                          if (bugForm.description.trim()) {
                            // Simuler l'envoi
                            console.log('Bug report:', bugForm);
                            setBugSubmitted(true);
                          } else {
                            alert('Veuillez entrer une description.');
                          }
                        }}
                        style={{
                          marginTop: '24px',
                          padding: '14px 32px',
                          border: 'none',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '1em',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        📨 Envoyer le signalement
                      </button>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <span style={{ fontSize: '4em' }}>✅</span>
                      <h3 style={{ color: '#16a34a', marginTop: '16px' }}>Merci pour votre signalement!</h3>
                      <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '400px', margin: '12px auto 0' }}>
                        Nous avons bien reçu votre message et nous y répondrons dans les plus brefs délais.
                      </p>
                      <button
                        onClick={() => {
                          setBugSubmitted(false);
                          setBugForm({ type: 'bug', description: '', email: '' });
                          setActiveModal(null);
                        }}
                        style={{
                          marginTop: '24px',
                          padding: '12px 24px',
                          border: '2px solid #667eea',
                          borderRadius: '12px',
                          background: 'white',
                          color: '#667eea',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Fermer
                      </button>
                    </div>
                  )}
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  // Rendu de la section active
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profil': return renderProfil();
      case 'abonnement': return renderAbonnement();
      case 'preferences': return renderPreferences();
      case 'notifications': return renderNotifications();
      case 'securite': return renderSecurite();
      case 'apropos': return renderAPropos();
      default: return renderProfil();
    }
  };
  
  // Contenu principal
  const renderContent = () => (
    <div 
      onClick={(e) => e.stopPropagation()}
      style={{
      background: 'transparent',
      borderRadius: '0',
      padding: '0',
      minHeight: '100%',
      height: '100%',
      display: isMobile ? 'flex' : 'grid',
      flexDirection: isMobile ? 'column' : undefined,
      gridTemplateColumns: isMobile ? undefined : '220px 1fr',
      gap: '0',
      overflow: 'hidden'
    }}>
      {/* Sidebar Navigation - toujours visible sur desktop, visible uniquement si pas de section active sur mobile */}
      {(!isMobile || activeSection === null) && (
      <div style={{
        background: 'transparent',
        padding: isMobile ? '30px 20px' : '24px 16px',
        borderRight: 'none',
        flex: isMobile ? 1 : undefined,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: isMobile ? 'flex-start' : 'flex-start',
        paddingTop: isMobile ? '40px' : '24px'
      }}>
        <nav style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: isMobile ? '16px' : '6px',
          maxWidth: isMobile ? '400px' : undefined,
          margin: isMobile ? '0 auto' : undefined,
          width: '100%'
        }}>
          {navSections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '15px' : '10px',
                padding: isMobile ? '22px 24px' : '12px 14px',
                borderRadius: isMobile ? '18px' : '10px',
                border: 'none',
                background: activeSection === section.id 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : isMobile ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: activeSection === section.id 
                  ? 'white' 
                  : isDark ? 'rgba(255,255,255,0.9)' : '#4a5568',
                fontWeight: activeSection === section.id ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
                fontSize: isMobile ? '1.15em' : '0.95em',
                boxShadow: isMobile ? '0 4px 15px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              <span style={{ fontSize: isMobile ? '1.5em' : '1.1em' }}>{section.icon}</span>
              <span style={{ flex: 1 }}>{section.label}</span>
              {section.id === 'abonnement' && (
                <span style={{
                  background: activeSection === section.id ? 'rgba(255,255,255,0.3)' : '#667eea',
                  color: 'white',
                  padding: isMobile ? '4px 12px' : '2px 8px',
                  borderRadius: '8px',
                  fontSize: isMobile ? '0.7em' : '0.65em',
                  fontWeight: 'bold'
                }}>
                  {t('settings.badges.free')}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
      )}
      
      {/* Content Area - caché sur mobile si pas de section active */}
      {(!isMobile || activeSection !== null) && (
      <div style={{ 
        padding: isMobile ? '0 15px' : '0', 
        overflowY: 'auto', 
        background: 'transparent',
        flex: isMobile ? 1 : undefined
      }}>
        {renderActiveSection()}
      </div>
      )}
    </div>
  );

  return (
    <>
      {/* Keyframes pour les animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* Mode Normal - Click pour plein écran */}
      <div 
        style={{ 
          minHeight: 'calc(100vh - 70px)', 
          padding: '0',
          position: 'relative',
          background: isDark ? 'linear-gradient(180deg, #040449 0%, #100261 100%)' : '#ffffff'
        }}
      >
        {/* Header Mode Normal */}
        {!isFullScreen && (
          <div style={{
            padding: '20px 30px',
            background: 'transparent'
          }}>
            <h1 style={{ margin: 0, fontSize: '1.5em', fontWeight: 'bold', color: isDark ? 'white' : '#1e293b' }}>
              ⚙️ {t('settings.title')}
            </h1>
            <p style={{ margin: '5px 0 0', fontSize: '0.9em', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}>
              {t('settings.subtitle')}
            </p>
          </div>
        )}
        
        {/* Overlay transparent pour capturer tous les clics en mode normal - désactivé pendant onboarding */}
        {!isFullScreen && !showGuide && !showContinueBar && (
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
        {renderContent()}
        
        {/* ZONE DE NOTIFICATIONS en mode normal - Barre "Terminer!" */}
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
            zIndex: 900
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
              {t('common.finish')} →
            </button>
          </div>
        )}
      </div>

      {/* ===== MODAL GUIDE ONBOARDING ===== */}
      <PageGuideModal
        isOpen={showGuide}
        onClose={closeModal}
        icon="⚙️"
        titleKey="settings.guideModal.title"
        messageKey="settings.guideModal.message"
        hintIcon="👆"
        hintKey="settings.guideModal.hint"
      />
      
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
          {/* Header plein écran */}
          <div style={{
            background: 'transparent',
            padding: isMobile ? '15px' : '15px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: 'none',
            position: 'relative'
          }}>
            {/* Spacer gauche pour centrage sur mobile */}
            {isMobile && <div style={{ width: '40px' }} />}
            
            <div style={{ 
              flex: isMobile ? 1 : undefined,
              textAlign: isMobile ? 'center' : 'left'
            }}>
              <h1 style={{ 
                margin: 0, 
                fontSize: isMobile ? '1.2em' : '1.5em', 
                fontWeight: 'bold', 
                color: isDark ? 'white' : '#1e293b' 
              }}>
                ⚙️ {t('settings.title')}
              </h1>
              {!isMobile && (
                <p style={{ margin: '5px 0 0', fontSize: '0.9em', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}>
                  {t('settings.subtitle')}
                </p>
              )}
            </div>
            
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                if (isMobile) {
                  // Sur mobile, si on est dans une section, retourner au menu
                  if (activeSection !== null) {
                    setActiveSection(null);
                  } else {
                    // Sinon ouvrir le sidebar principal
                    window.dispatchEvent(new CustomEvent('openSidebar'));
                  }
                } else {
                  setIsFullScreen(false);
                }
              }}
              style={{
                background: isDark ? 'rgba(0,0,0,0.2)' : '#e2e8f0',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                borderRadius: '50%',
                width: isMobile ? '36px' : '40px',
                height: isMobile ? '36px' : '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: isMobile ? '1.1em' : '1.3em',
                color: isDark ? 'white' : '#475569'
              }}
            >
              {isMobile && activeSection !== null ? '←' : '✕'}
            </button>
          </div>
          
          {/* Sous-titre sur mobile - seulement quand on est dans le menu */}
          {isMobile && activeSection === null && (
            <p style={{ 
              margin: '0 15px 60px', 
              fontSize: '0.85em', 
              color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b',
              textAlign: 'center'
            }}>
              {t('settings.subtitle')}
            </p>
          )}
          
          {/* ZONE DE NOTIFICATIONS - Barre "On continue" seulement si active */}
          {showContinueBar && (
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
                {t('common.finish')} →
              </button>
            )}
          
          {/* Contenu plein écran */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ flex: 1, overflow: 'auto', padding: '0' }}
          >
            {renderContent()}
          </div>
        </div>
      )}
      
      {/* 🔐 Modal Configuration 2FA (QR Code) */}
      {show2FASetupModal && twoFASetupData && (
        <div 
          onClick={() => {
            setShow2FASetupModal(false);
            setTwoFACode('');
            setTwoFAError(null);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDark ? 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' : '#ffffff',
              borderRadius: '20px',
              maxWidth: '450px',
              width: '100%',
              overflow: 'hidden',
              border: '2px solid #667eea'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
              borderBottom: '1px solid rgba(102, 126, 234, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '2em' }}>🛡️</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3em', color: isDark ? 'white' : '#1e293b' }}>
                  {t('settings.security.twoFactor.setup.title')}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.9em', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>
                  {t('settings.security.twoFactor.setup.subtitle')}
                </p>
              </div>
            </div>
            
            {/* Contenu */}
            <div style={{ padding: '24px', textAlign: 'center' }}>
              {/* QR Code */}
              <div style={{
                background: 'white',
                padding: '16px',
                borderRadius: '12px',
                display: 'inline-block',
                marginBottom: '16px'
              }}>
                <img 
                  src={twoFASetupData.qrCode} 
                  alt="QR Code 2FA" 
                  style={{ width: '200px', height: '200px' }}
                />
              </div>
              
              {/* Secret manuel */}
              <p style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b', fontSize: '0.85em', marginBottom: '8px' }}>
                {t('settings.security.twoFactor.setup.manualEntry')}
              </p>
              <code style={{
                display: 'block',
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '0.9em',
                fontFamily: 'monospace',
                letterSpacing: '2px',
                color: isDark ? 'white' : '#1e293b',
                marginBottom: '20px',
                wordBreak: 'break-all'
              }}>
                {twoFASetupData.secret}
              </code>
              
              {/* Champ de vérification */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: isDark ? 'white' : '#1e293b',
                  fontWeight: '500',
                  textAlign: 'left'
                }}>
                  {t('settings.security.twoFactor.setup.enterCode')}
                </label>
                <input
                  type="text"
                  value={twoFACode}
                  onChange={(e) => {
                    setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setTwoFAError(null);
                  }}
                  placeholder="000000"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: `2px solid ${twoFAError ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)')}`,
                    borderRadius: '10px',
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'white',
                    color: isDark ? 'white' : '#1e293b',
                    fontSize: '1.5em',
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontWeight: '600',
                    outline: 'none'
                  }}
                />
              </div>
              
              {/* Erreur */}
              {twoFAError && (
                <p style={{ color: '#ef4444', fontSize: '0.9em', marginBottom: '16px' }}>
                  ❌ {twoFAError}
                </p>
              )}
              
              {/* Boutons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShow2FASetupModal(false);
                    setTwoFACode('');
                    setTwoFAError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    border: isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid rgba(0,0,0,0.1)',
                    borderRadius: '10px',
                    background: 'transparent',
                    color: isDark ? 'white' : '#1e293b',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleVerify2FA}
                  disabled={twoFACode.length !== 6 || twoFALoading}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    border: 'none',
                    borderRadius: '10px',
                    background: twoFACode.length === 6 && !twoFALoading
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'rgba(102, 126, 234, 0.3)',
                    color: 'white',
                    fontWeight: '600',
                    cursor: twoFACode.length === 6 && !twoFALoading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {twoFALoading && (
                    <span style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                  )}
                  {t('settings.security.twoFactor.setup.activate')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 🔐 Modal Codes Backup */}
      {show2FABackupModal && (
        <div 
          onClick={() => {
            if (twoFABackupCodes.length > 0) {
              setShow2FABackupModal(false);
              setTwoFABackupCodes([]);
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDark ? 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' : '#ffffff',
              borderRadius: '20px',
              maxWidth: '450px',
              width: '100%',
              overflow: 'hidden',
              border: '2px solid #2ecc71'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              background: 'rgba(46, 204, 113, 0.15)',
              borderBottom: '1px solid rgba(46, 204, 113, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '2em' }}>✅</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3em', color: isDark ? 'white' : '#1e293b' }}>
                  {twoFABackupCodes.length > 0 
                    ? t('settings.security.twoFactor.backup.title')
                    : t('settings.security.twoFactor.backup.regenerateTitle')
                  }
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.9em', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>
                  {t('settings.security.twoFactor.backup.subtitle')}
                </p>
              </div>
            </div>
            
            {/* Contenu */}
            <div style={{ padding: '24px' }}>
              {twoFABackupCodes.length > 0 ? (
                <>
                  {/* Avertissement */}
                  <div style={{
                    background: 'rgba(255, 165, 0, 0.15)',
                    border: '1px solid rgba(255, 165, 0, 0.3)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    marginBottom: '16px'
                  }}>
                    <p style={{ margin: 0, color: '#ffa500', fontSize: '0.9em' }}>
                      ⚠️ {t('settings.security.twoFactor.backup.warning')}
                    </p>
                  </div>
                  
                  {/* Codes */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    marginBottom: '20px'
                  }}>
                    {twoFABackupCodes.map((code, index) => (
                      <div 
                        key={index}
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          padding: '10px',
                          borderRadius: '8px',
                          fontFamily: 'monospace',
                          fontSize: '1em',
                          textAlign: 'center',
                          color: isDark ? 'white' : '#1e293b',
                          letterSpacing: '2px'
                        }}
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                  
                  {/* Bouton copier */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(twoFABackupCodes.join('\n'));
                      alert(t('settings.security.twoFactor.backup.copied'));
                    }}
                    style={{
                      width: '100%',
                      padding: '14px',
                      border: '2px solid #667eea',
                      borderRadius: '10px',
                      background: 'transparent',
                      color: '#667eea',
                      fontWeight: '600',
                      cursor: 'pointer',
                      marginBottom: '12px'
                    }}
                  >
                    📋 {t('settings.security.twoFactor.backup.copy')}
                  </button>
                  
                  {/* Bouton fermer */}
                  <button
                    onClick={() => {
                      setShow2FABackupModal(false);
                      setTwoFABackupCodes([]);
                    }}
                    style={{
                      width: '100%',
                      padding: '14px',
                      border: 'none',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
                      color: 'white',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {t('settings.security.twoFactor.backup.saved')}
                  </button>
                </>
              ) : (
                <>
                  {/* Formulaire régénération */}
                  <p style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', marginBottom: '16px' }}>
                    {t('settings.security.twoFactor.backup.regenerateInfo')}
                  </p>
                  
                  <input
                    type="text"
                    value={twoFACode}
                    onChange={(e) => {
                      setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setTwoFAError(null);
                    }}
                    placeholder="000000"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: `2px solid ${twoFAError ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)')}`,
                      borderRadius: '10px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'white',
                      color: isDark ? 'white' : '#1e293b',
                      fontSize: '1.5em',
                      textAlign: 'center',
                      letterSpacing: '8px',
                      fontWeight: '600',
                      outline: 'none',
                      marginBottom: '16px'
                    }}
                  />
                  
                  {twoFAError && (
                    <p style={{ color: '#ef4444', fontSize: '0.9em', marginBottom: '16px' }}>
                      ❌ {twoFAError}
                    </p>
                  )}
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => {
                        setShow2FABackupModal(false);
                        setTwoFACode('');
                        setTwoFAError(null);
                      }}
                      style={{
                        flex: 1,
                        padding: '14px',
                        border: isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid rgba(0,0,0,0.1)',
                        borderRadius: '10px',
                        background: 'transparent',
                        color: isDark ? 'white' : '#1e293b',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleRegenerateBackup}
                      disabled={twoFACode.length !== 6 || twoFALoading}
                      style={{
                        flex: 1,
                        padding: '14px',
                        border: 'none',
                        borderRadius: '10px',
                        background: twoFACode.length === 6 && !twoFALoading
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'rgba(102, 126, 234, 0.3)',
                        color: 'white',
                        fontWeight: '600',
                        cursor: twoFACode.length === 6 && !twoFALoading ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {t('settings.security.twoFactor.backup.regenerate')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* 🔐 Modal Désactiver 2FA */}
      {show2FADisableModal && (
        <div 
          onClick={() => {
            if (!twoFALoading) {
              setShow2FADisableModal(false);
              setTwoFAPassword('');
              setTwoFAError(null);
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDark ? 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' : '#ffffff',
              borderRadius: '20px',
              maxWidth: '400px',
              width: '100%',
              overflow: 'hidden',
              border: '2px solid #ef4444'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '2em' }}>⚠️</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3em', color: '#ef4444' }}>
                  {t('settings.security.twoFactor.disableModal.title')}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.9em', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>
                  {t('settings.security.twoFactor.disableModal.subtitle')}
                </p>
              </div>
            </div>
            
            {/* Contenu */}
            <div style={{ padding: '24px' }}>
              <p style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', marginBottom: '16px' }}>
                {t('settings.security.twoFactor.disableModal.enterPassword')}
              </p>
              
              <input
                type="password"
                value={twoFAPassword}
                onChange={(e) => {
                  setTwoFAPassword(e.target.value);
                  setTwoFAError(null);
                }}
                placeholder={t('settings.security.twoFactor.disableModal.passwordPlaceholder')}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: `2px solid ${twoFAError ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)')}`,
                  borderRadius: '10px',
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'white',
                  color: isDark ? 'white' : '#1e293b',
                  fontSize: '1em',
                  outline: 'none',
                  marginBottom: '16px'
                }}
              />
              
              {twoFAError && (
                <p style={{ color: '#ef4444', fontSize: '0.9em', marginBottom: '16px' }}>
                  ❌ {twoFAError}
                </p>
              )}
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShow2FADisableModal(false);
                    setTwoFAPassword('');
                    setTwoFAError(null);
                  }}
                  disabled={twoFALoading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    border: isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid rgba(0,0,0,0.1)',
                    borderRadius: '10px',
                    background: 'transparent',
                    color: isDark ? 'white' : '#1e293b',
                    fontWeight: '600',
                    cursor: twoFALoading ? 'not-allowed' : 'pointer',
                    opacity: twoFALoading ? 0.5 : 1
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDisable2FA}
                  disabled={!twoFAPassword || twoFALoading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    border: 'none',
                    borderRadius: '10px',
                    background: twoFAPassword && !twoFALoading ? '#ef4444' : 'rgba(239, 68, 68, 0.3)',
                    color: 'white',
                    fontWeight: '600',
                    cursor: twoFAPassword && !twoFALoading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {twoFALoading && (
                    <span style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                  )}
                  {t('settings.security.twoFactor.disableModal.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ✅ Modal de succès - Déconnexion de toutes les sessions */}
      {showLogoutSuccessModal && (
        <div 
          onClick={() => setShowLogoutSuccessModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDark ? 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' : '#ffffff',
              borderRadius: '24px',
              maxWidth: '380px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              animation: 'slideUp 0.4s ease',
              border: isDark ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(34, 197, 94, 0.2)'
            }}
          >
            {/* Icône de succès animée */}
            <div style={{
              padding: '32px 24px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                animation: 'pulse 2s ease infinite'
              }}>
                <span style={{ fontSize: '40px' }}>✅</span>
              </div>
              
              <h2 style={{ 
                margin: '0 0 12px', 
                fontSize: '1.4em', 
                color: isDark ? 'white' : '#1e293b',
                fontWeight: '700'
              }}>
                {t('settings.security.sessions.disconnectAllSuccess') || 'Sessions déconnectées!'}
              </h2>
              
              <p style={{ 
                margin: 0, 
                fontSize: '0.95em', 
                color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b',
                lineHeight: '1.5'
              }}>
                Toutes vos autres sessions ont été déconnectées. Seule cette session reste active.
              </p>
            </div>
            
            {/* Bouton */}
            <div style={{ padding: '0 24px 24px' }}>
              <button
                onClick={() => setShowLogoutSuccessModal(false)}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: 'none',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '1.05em',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.02)';
                  e.target.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '0 4px 14px rgba(34, 197, 94, 0.4)';
                }}
              >
                Compris!
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 🗑️ Modal de confirmation suppression de compte */}
      {showDeleteAccountModal && (
        <div 
          onClick={() => !isDeleting && setShowDeleteAccountModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDark ? 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' : '#ffffff',
              borderRadius: '20px',
              maxWidth: '500px',
              width: '100%',
              overflow: 'hidden',
              border: '2px solid #ef4444'
            }}
          >
            {/* Header d'avertissement */}
            <div style={{
              padding: '20px 24px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '2em' }}>⚠️</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3em', color: '#ef4444' }}>
                  {t('settings.security.deleteAccount.modal.title')}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.9em', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>
                  {t('settings.security.deleteAccount.modal.subtitle')}
                </p>
              </div>
            </div>
            
            {/* Contenu */}
            <div style={{ padding: '24px' }}>
              {/* Liste des données supprimées */}
              <div style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: '0 0 12px', fontWeight: '600', color: isDark ? 'white' : '#1e293b' }}>
                  {t('settings.security.deleteAccount.modal.dataDeleted')}
                </p>
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: '20px', 
                  color: isDark ? 'rgba(255,255,255,0.8)' : '#64748b',
                  fontSize: '0.9em',
                  lineHeight: '1.8'
                }}>
                  <li>{t('settings.security.deleteAccount.modal.data.accounts')}</li>
                  <li>{t('settings.security.deleteAccount.modal.data.budget')}</li>
                  <li>{t('settings.security.deleteAccount.modal.data.goals')}</li>
                  <li>{t('settings.security.deleteAccount.modal.data.settings')}</li>
                  <li style={{ color: '#f59e0b', fontWeight: '500' }}>{t('settings.security.deleteAccount.modal.data.trial')}</li>
                </ul>
              </div>
              
              {/* Champ de confirmation */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: isDark ? 'white' : '#1e293b',
                  fontWeight: '500'
                }}>
                  {t('settings.security.deleteAccount.modal.confirmLabel')}
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder={deleteConfirmWord}
                  disabled={isDeleting}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: `2px solid ${deleteConfirmText === deleteConfirmWord ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)')}`,
                    borderRadius: '10px',
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'white',
                    color: isDark ? 'white' : '#1e293b',
                    fontSize: '1em',
                    textAlign: 'center',
                    letterSpacing: '2px',
                    fontWeight: '600',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>
              
              {/* Message d'erreur */}
              {deleteError && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  color: '#ef4444',
                  fontSize: '0.9em'
                }}>
                  ❌ {deleteError}
                </div>
              )}
              
              {/* Boutons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowDeleteAccountModal(false);
                    setDeleteConfirmText('');
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    border: isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid rgba(0,0,0,0.1)',
                    borderRadius: '10px',
                    background: 'transparent',
                    color: isDark ? 'white' : '#1e293b',
                    fontWeight: '600',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    opacity: isDeleting ? 0.5 : 1
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== deleteConfirmWord || isDeleting}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    border: 'none',
                    borderRadius: '10px',
                    background: deleteConfirmText === deleteConfirmWord && !isDeleting 
                      ? '#ef4444' 
                      : (isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'),
                    color: 'white',
                    fontWeight: '600',
                    cursor: deleteConfirmText === deleteConfirmWord && !isDeleting ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isDeleting ? (
                    <>
                      <span style={{
                        width: '18px',
                        height: '18px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      {t('settings.security.deleteAccount.modal.deleting')}
                    </>
                  ) : (
                    t('settings.security.deleteAccount.modal.confirmButton')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      
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

export default Parametres;
