// 🧭 PL4TO - Hook PWA Installation
// Gère l'installation de l'app en tant que PWA

import { useState, useEffect } from 'react';

export const usePWA = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Détecter iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Détecter si l'app est en mode standalone (déjà installée)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone ||
                       document.referrer.includes('android-app://');
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      console.log('🧭 PL4TO: PWA installable détecté');
    };

    // Écouter l'événement appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      console.log('🧭 PL4TO: App installée avec succès!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Fonction pour déclencher l'installation
  const installApp = async () => {
    if (!installPrompt) {
      console.log('🧭 PL4TO: Pas de prompt disponible');
      return false;
    }

    try {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      console.log(`🧭 PL4TO: Installation ${outcome === 'accepted' ? 'acceptée' : 'refusée'}`);
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setInstallPrompt(null);
      return outcome === 'accepted';
    } catch (error) {
      console.error('🧭 PL4TO: Erreur installation:', error);
      return false;
    }
  };

  return {
    installPrompt,
    isInstalled,
    isIOS,
    isStandalone,
    canInstall: !!installPrompt && !isInstalled,
    installApp
  };
};

export default usePWA;
