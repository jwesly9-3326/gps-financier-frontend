// 🧭 PL4TO - SIDEBAR (Navigation Verticale)
// Tous les boutons alignés et distribués uniformément
// + Modal de confirmation de déconnexion
// + Système de guide utilisateur (pages bloquées jusqu'à complétion)
// 🌍 i18n enabled
// ✅ Utilise useGuideProgress pour la logique centralisée
// 🎨 Theme support

import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useGuideProgress from '../../hooks/useGuideProgress';

const Sidebar = ({ isMobile = false, isOpen = true, onClose = () => {}, onMobileNavigate = null }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, isDark } = useTheme();
  
  // 📱 Détecter si on est en mode PWA (standalone)
  const [isPWA, setIsPWA] = useState(false);
  
  useEffect(() => {
    setIsPWA(window.matchMedia('(display-mode: standalone)').matches);
  }, []);
  
  // ✅ Hook centralisé pour la progression du guide
  const { isPageAccessible, isGuideComplete } = useGuideProgress();
  
  // État pour le modal de déconnexion
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/');
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  // TOUS les items de navigation avec clés i18n
  const allNavItems = [
    { path: '/dashboard', icon: '🏠', labelKey: 'nav.home' },
    { path: '/comptes', icon: '💳', labelKey: 'nav.accounts' },
    { path: '/budget', icon: '📋', labelKey: 'nav.budget' },
    { path: '/objectifs', icon: '🧭', labelKey: 'nav.goals' },
    { path: '/gps', icon: 'gps-special', labelKey: 'nav.gps', isGPS: true },
    { path: '/simulations', icon: '🧮', labelKey: 'nav.calculator' },
    { path: '/gestion-comptes', icon: '📊', labelKey: 'nav.management' },
    { path: '/parametres', icon: '⚙️', labelKey: 'nav.settings' },
    { path: 'logout', icon: '🚪', labelKey: 'nav.logout', isLogout: true }
  ];

  // Composant O animé pour GPS Financier
  const GPSIcon = ({ isLocked }) => (
    <div style={{
      position: 'relative',
      width: isMobile ? '48px' : '38px',
      height: isMobile ? '48px' : '38px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: isLocked ? 0.4 : 1
    }}>
      <div style={{
        position: 'absolute',
        width: isMobile ? '48px' : '38px',
        height: isMobile ? '48px' : '38px',
        borderRadius: '50%',
        border: isMobile ? '5px solid transparent' : '4px solid transparent',
        background: `linear-gradient(${isDark ? '#040449' : '#ffffff'}, ${isDark ? '#040449' : '#ffffff'}) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box`,
        animation: isLocked ? 'none' : 'gps-ring-spin 3s linear infinite',
        boxShadow: isLocked ? 'none' : '0 0 10px rgba(255, 165, 0, 0.5)'
      }} />
    </div>
  );

  // Ne pas afficher si mobile et fermé
  if (isMobile && !isOpen) return null;

  return (
    <>
      <div style={{
        width: isMobile ? '100%' : '240px',
        minWidth: isMobile ? '100%' : '240px',
        background: isDark 
          ? 'linear-gradient(180deg, #040449 0%, #100261 100%)' 
          : '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        padding: isMobile ? '25px 10px' : '15px 12px',
        boxShadow: 'none',
        height: isMobile 
          ? (isPWA 
            ? 'calc(100vh - 70px - env(safe-area-inset-top, 0px))' 
            : 'calc(100vh - 85px)') 
          : '100%',
        borderRight: 'none',
        transition: 'all 0.3s ease',
        // Mobile: position fixe plein écran | Desktop: position normale dans le flex
        position: isMobile ? 'fixed' : 'relative',
        // 📱 FIX: Mobile navigateur ET PWA - ajuster le top pour le header
        // PWA: 70px + safe-area, Navigateur: 85px (header agrandi pour barre d'état)
        top: isMobile 
          ? (isPWA 
            ? 'calc(70px + env(safe-area-inset-top, 0px))' 
            : '85px') 
          : 'auto',
        left: 0,
        right: isMobile ? 0 : 'auto',
        bottom: isMobile ? 0 : 'auto',
        zIndex: isMobile ? 999 : 'auto',
        overflowY: isMobile ? 'auto' : 'visible'
      }}>
        {/* Navigation - tous les boutons distribués uniformément */}
        <nav style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isMobile ? 'space-evenly' : 'space-between',
          gap: '0',
          paddingBottom: isMobile ? '10px' : '0'
        }}>
          {allNavItems.map((item) => {
            // ✅ Utilisation du hook centralisé
            const isAccessible = item.isLogout || isPageAccessible(item.path);
            const isLocked = !isAccessible;
            
            // Cas spécial pour Déconnexion (bouton, pas un lien)
            if (item.isLogout) {
              return (
                <button
                  key={item.path}
                  onClick={handleLogoutClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: isMobile ? '16px' : '14px',
                    padding: isMobile ? '18px 25px' : '14px 18px',
                    borderRadius: isMobile ? '16px' : '12px',
                    color: '#f87171',
                    background: 'transparent',
                    border: 'none',
                    fontSize: isMobile ? '1.2em' : '1.05em',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    width: '100%',
                    textAlign: 'left',
                    borderLeft: isMobile ? 'none' : '4px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(248, 113, 113, 0.15)';
                    e.currentTarget.style.borderLeftColor = '#f87171';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }}
                >
                  <span style={{ fontSize: isMobile ? '1.4em' : '1.05em', width: isMobile ? '32px' : '26px', textAlign: 'center' }}>{item.icon}</span>
                  <span>{t(item.labelKey)}</span>
                </button>
              );
            }

            // Élément bloqué (non accessible)
            if (isLocked) {
              return (
                <div
                  key={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: isMobile ? '16px' : '14px',
                    padding: isMobile ? '18px 25px' : '14px 18px',
                    borderRadius: isMobile ? '16px' : '12px',
                    color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                    fontSize: isMobile ? '1.2em' : '1.05em',
                    fontWeight: '600',
                    cursor: 'not-allowed',
                    borderLeft: isMobile ? 'none' : '4px solid transparent',
                    position: 'relative'
                  }}
                  title={t('nav.locked')}
                >
                  {item.icon === 'gps-special' ? (
                    <GPSIcon isLocked={true} />
                  ) : (
                    <span style={{ fontSize: isMobile ? '1.4em' : '1.05em', width: isMobile ? '32px' : '26px', textAlign: 'center', opacity: 0.4 }}>{item.icon}</span>
                  )}
                  {!item.isGPS && (
                    <span style={{ opacity: 0.4 }}>{t(item.labelKey)}</span>
                  )}
                </div>
              );
            }

            // NavLink pour les items accessibles
            // Sur mobile, certains items ont un comportement spécial
            const handleMobileClick = (e, path) => {
              if (isMobile && onMobileNavigate) {
                // Gestion de portefeuille -> vue plein écran
                if (path === '/gestion-comptes') {
                  e.preventDefault();
                  onMobileNavigate('gestion-comptes-fullscreen');
                  onClose();
                  return;
                }
                // Paramètres -> menu sidebar paramètres
                if (path === '/parametres') {
                  e.preventDefault();
                  onMobileNavigate('parametres-menu');
                  onClose();
                  return;
                }
              }
              // Fermer le sidebar mobile après navigation
              if (isMobile) {
                onClose();
              }
            };

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={(e) => handleMobileClick(e, item.path)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: isMobile ? '16px' : '14px',
                  padding: isMobile ? '18px 25px' : '14px 18px',
                  borderRadius: isMobile ? '16px' : '12px',
                  color: isActive 
                    ? (isDark ? 'white' : '#667eea') 
                    : (isDark ? 'rgba(255,255,255,0.85)' : '#1e3a8a'),
                  textDecoration: 'none',
                  fontSize: isMobile ? '1.2em' : '1.05em',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  background: isActive 
                    ? item.isGPS 
                      ? 'linear-gradient(90deg, rgba(255, 152, 0, 0.25) 0%, transparent 100%)'
                      : isDark 
                        ? 'linear-gradient(90deg, rgba(102, 126, 234, 0.3) 0%, transparent 100%)'
                        : 'rgba(102, 126, 234, 0.15)'
                    : item.isGPS
                      ? 'linear-gradient(90deg, rgba(255, 152, 0, 0.1) 0%, transparent 100%)'
                      : 'transparent',
                  borderLeft: isMobile 
                    ? 'none' 
                    : (isActive 
                      ? `4px solid ${item.isGPS ? '#ff9800' : '#667eea'}`
                      : '4px solid transparent')
                })}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.classList.contains('active')) {
                    e.currentTarget.style.background = item.isGPS 
                      ? 'linear-gradient(90deg, rgba(255, 152, 0, 0.2) 0%, transparent 100%)'
                      : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(102, 126, 234, 0.08)';
                    e.currentTarget.style.borderLeftColor = item.isGPS ? '#ff9800' : 'rgba(255, 152, 0, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  if (!isActive) {
                    e.currentTarget.style.background = item.isGPS 
                      ? 'linear-gradient(90deg, rgba(255, 152, 0, 0.1) 0%, transparent 100%)'
                      : 'transparent';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }
                }}
              >
                {item.icon === 'gps-special' ? (
                  <div title={t('nav.gps')}>
                    <GPSIcon isLocked={false} />
                  </div>
                ) : (
                  <span style={{ fontSize: isMobile ? '1.4em' : '1.05em', width: isMobile ? '32px' : '26px', textAlign: 'center' }}>{item.icon}</span>
                )}
                {!item.isGPS && <span>{t(item.labelKey)}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* CSS Animation pour le O GPS */}
        <style>{`
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
        `}</style>
      </div>

      {/* ========== MODAL DE CONFIRMATION DÉCONNEXION ========== */}
      {showLogoutModal && (
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
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '40px 50px',
            maxWidth: '440px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
            animation: 'modal-appear 0.25s ease-out'
          }}>
            {/* Titre avec emojis */}
            <h2 style={{
              fontSize: '1.8em',
              fontWeight: 'bold',
              color: '#2c3e50',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}>
              {t('logout.title')}
              <span style={{ fontSize: '0.8em' }}>👋😊</span>
            </h2>

            <p style={{
              fontSize: '1.05em',
              color: '#7f8c8d',
              marginBottom: '30px',
              lineHeight: '1.6'
            }}>
              {t('logout.message')}
            </p>

            {/* Boutons sur la même ligne */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleCancelLogout}
                style={{
                  padding: '12px 20px',
                  background: 'white',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  color: '#7f8c8d',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.95em',
                  transition: 'all 0.3s',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                  e.currentTarget.style.borderColor = '#bdc3c7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}
              >
                {t('logout.stay')}
              </button>
              <button
                onClick={handleConfirmLogout}
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.95em',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                }}
              >
                🚪 {t('logout.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
