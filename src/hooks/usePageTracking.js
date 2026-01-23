// 📊 HOOK: useAnalytics
// Track automatiquement les pages vues et expose les fonctions de tracking

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../services/analytics.service';

// Map des noms de pages pour un meilleur reporting
const PAGE_NAMES = {
  '/': 'Landing Page',
  '/login': 'Login',
  '/register': 'Register',
  '/dashboard': 'Dashboard',
  '/comptes': 'Comptes',
  '/budget': 'Budget',
  '/objectifs': 'Objectifs',
  '/gps': 'GPS Financier',
  '/simulations': 'Simulations',
  '/gestion': 'Gestion Comptes',
  '/parametres': 'Paramètres',
  '/onboarding': 'Onboarding',
  '/subscription/success': 'Subscription Success',
  '/subscription/cancel': 'Subscription Cancel'
};

const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Obtenir le nom de la page ou utiliser le path
    const pageName = PAGE_NAMES[location.pathname] || location.pathname;
    
    // Tracker la page vue
    trackPageView(location.pathname, pageName);
  }, [location]);
};

export default usePageTracking;
