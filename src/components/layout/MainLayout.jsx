// 🧭 GPS FINANCIER - MAIN LAYOUT (Structure 100% Fixe)
// Design: Interface type "application dashboard" sans scroll de page
// VERSION MODIFIÉE: Timeline affichée seulement sur GPS Financier
// + Intégration TrialWelcomeModal pour les rappels trial
// 📱 RESPONSIVE: Sidebar fermé par défaut sur mobile
// 📱 ROTATION: Bloquée sur toutes les pages sauf Itinéraire

import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Timeline from './Timeline';
import TrialWelcomeModal from '../common/TrialWelcomeModal';
import useTrialReminders from '../../hooks/useTrialReminders';
import { useTranslation } from 'react-i18next';

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // 📱 Détection mobile et orientation
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768 || window.innerHeight < 500);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  
  // 📱 Vérifier si on doit ouvrir le sidebar (paramètre URL après login mobile)
  const searchParams = new URLSearchParams(location.search);
  const shouldOpenSidebar = searchParams.get('openSidebar') === 'true';
  const [sidebarOpen, setSidebarOpen] = useState(
    shouldOpenSidebar || window.innerWidth >= 768
  );
  
  // 📱 Flag pour ignorer la fermeture automatique lors du premier rendu avec openSidebar
  const initialOpenRef = useRef(shouldOpenSidebar);
  
  // Nettoyer le paramètre openSidebar de l'URL après lecture
  useEffect(() => {
    if (shouldOpenSidebar) {
      // Forcer l'ouverture du sidebar
      setSidebarOpen(true);
      // Nettoyer l'URL
      const newUrl = location.pathname;
      navigate(newUrl, { replace: true });
      // Reset le flag après un court délai
      setTimeout(() => {
        initialOpenRef.current = false;
      }, 500);
    }
  }, [shouldOpenSidebar, location.pathname, navigate]);
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768 || window.innerHeight < 500;
      const landscape = window.innerWidth > window.innerHeight;
      setIsMobile(mobile);
      setIsLandscape(landscape);
      // Fermer sidebar automatiquement sur mobile, ouvrir sur desktop
      if (mobile && sidebarOpen) setSidebarOpen(false);
      if (!mobile && !sidebarOpen) setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [sidebarOpen]);
  
  // Fermer sidebar quand on change de page sur mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);
  
  // 📱 Écouter l'événement pour ouvrir le sidebar (depuis les pages)
  useEffect(() => {
    const handleOpenSidebar = () => setSidebarOpen(true);
    window.addEventListener('openSidebar', handleOpenSidebar);
    return () => window.removeEventListener('openSidebar', handleOpenSidebar);
  }, []);
  
  // 📱 Bloquer le scroll du body quand sidebar ouvert sur mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      // Sauvegarder la position de scroll actuelle
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restaurer le scroll
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMobile, sidebarOpen]);
  
  // 📱 SWIPE GESTURE: Gauche→Droite = Ouvrir Sidebar (mobile uniquement)
  // Exclu sur les pages GPS qui utilisent leur propre système de swipe
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const swipeHandled = useRef(false);
  
  // Pages où le swipe sidebar est désactivé (GPS utilise swipe pour navigation temporelle)
  const isGPSPage = location.pathname.startsWith('/gps');
  
  useEffect(() => {
    // Désactiver sur desktop et sur les pages GPS
    if (!isMobile || isGPSPage) return;
    
    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      swipeHandled.current = false;
    };
    
    const handleTouchMove = (e) => {
      if (touchStartX.current === null || swipeHandled.current) return;
      
      const touchCurrentX = e.touches[0].clientX;
      const touchCurrentY = e.touches[0].clientY;
      const deltaX = touchCurrentX - touchStartX.current;
      const deltaY = touchCurrentY - touchStartY.current;
      
      // Vérifier si c'est un swipe horizontal significatif
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
        // Swipe gauche → droite: Ouvrir sidebar
        if (deltaX > 0 && !sidebarOpen) {
          e.preventDefault();
          swipeHandled.current = true;
          setSidebarOpen(true);
        }
        // Swipe droite → gauche: Fermer sidebar
        else if (deltaX < 0 && sidebarOpen) {
          e.preventDefault();
          swipeHandled.current = true;
          setSidebarOpen(false);
        }
      }
    };
    
    const handleTouchEnd = () => {
      touchStartX.current = null;
      touchStartY.current = null;
      swipeHandled.current = false;
    };
    
    // passive: false est ESSENTIEL pour pouvoir appeler preventDefault()
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, sidebarOpen, isGPSPage]);
  
  // 🔔 Hook pour gérer les rappels trial
  const { 
    showModal, 
    popupType, 
    daysRemaining, 
    closeModal 
  } = useTrialReminders();
  
  // Déterminer si on doit afficher la Timeline
  // Timeline visible seulement sur la page: /gps-financier
  const showTimeline = location.pathname === '/gps-financier' || 
                       location.pathname.startsWith('/gps-financier/');

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // 📱 Gestion de la navigation mobile spéciale
  const handleMobileNavigate = (action) => {
    if (action === 'gestion-comptes-fullscreen') {
      // Naviguer vers Gestion de portefeuille en mode plein écran
      navigate('/gestion-comptes?fullscreen=true');
    } else if (action === 'parametres-menu') {
      // Naviguer vers Paramètres en mode plein écran (sidebar paramètres)
      navigate('/parametres?fullscreen=true');
    }
  };

  // 📱 Déterminer si on est sur la page Itinéraire (seule page autorisée en paysage)
  const isItinerairePage = location.pathname === '/gps/itineraire' || 
                           location.pathname.startsWith('/gps/itineraire');
  
  // 📱 Afficher l'overlay de blocage rotation si:
  // - On est sur mobile
  // - On est en mode paysage
  // - On n'est PAS sur la page Itinéraire
  const showRotationBlockOverlay = isMobile && isLandscape && !isItinerairePage;

  return (
    <div className="gps-app-container">
      {/* 📱 OVERLAY BLOCAGE ROTATION - Toutes pages sauf Itinéraire */}
      {showRotationBlockOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center'
        }}>
          {/* Icône de rotation */}
          <div style={{
            fontSize: '4em',
            marginBottom: '20px',
            animation: 'rotatePhone 2s ease-in-out infinite'
          }}>
            📱
          </div>
          
          {/* Flèche de rotation */}
          <div style={{
            fontSize: '2em',
            marginBottom: '20px',
            color: '#667eea'
          }}>
            ↻
          </div>
          
          {/* Titre */}
          <h2 style={{
            color: 'white',
            fontSize: '1.3em',
            fontWeight: 'bold',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            {t('common.rotateToPortrait', 'Tournez votre écran')}
          </h2>
          
          {/* Animation CSS */}
          <style>{`
            @keyframes rotatePhone {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(-15deg); }
              75% { transform: rotate(15deg); }
            }
          `}</style>
        </div>
      )}

      {/* Header Fixe en Haut */}
      <Header 
        isMobile={isMobile} 
        toggleSidebar={toggleSidebar} 
        sidebarOpen={sidebarOpen}
      />
      
      <div className="gps-app-body">
        {/* Sidebar - Responsive */}
        <Sidebar 
          isMobile={isMobile} 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          onMobileNavigate={handleMobileNavigate}
        />
        
        {/* Zone Principale Droite - cachée quand sidebar ouvert sur mobile */}
        {!(isMobile && sidebarOpen) && (
          <div className="gps-main-content">
            {/* Timeline Fixe - Conditionnelle */}
            {showTimeline && <Timeline />}
            
            {/* Zone de Contenu avec Scroll Interne */}
            <div className="gps-content-area">
              <Outlet />
            </div>
          </div>
        )}
      </div>
      
      {/* 🔔 Modal de rappel Trial (Welcome, 7 jours, 2 jours) */}
      <TrialWelcomeModal
        isOpen={showModal}
        onClose={closeModal}
        popupType={popupType}
        daysRemaining={daysRemaining}
      />
    </div>
  );
};

export default MainLayout;
