import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import InstallPWA from './components/common/InstallPWA';
import { AuthProvider } from './context/AuthContext';
import { UserDataProvider } from './context/UserDataContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import PlanificationEvenement from './pages/PlanificationEvenement/PlanificationEvenement';
import OnboardingFlow from './pages/Onboarding/OnboardingFlow';

// 🔒 Wrapper pour routes protégées avec MainLayout
const ProtectedMainLayout = () => (
  <ProtectedRoute>
    <MainLayout />
  </ProtectedRoute>
);

// Pages Publiques
import LandingPage from './pages/Landing/LandingPage';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import VerifyEmail from './pages/Auth/VerifyEmail';

// Pages Subscription (Stripe)
import SubscriptionSuccess from './pages/Subscription/SubscriptionSuccess';
import SubscriptionCancel from './pages/Subscription/SubscriptionCancel';

// Pages Protégées
import Dashboard from './pages/Dashboard/Dashboard';
import Comptes from './pages/Comptes/Comptes';
import Budget from './pages/Budget/Budget';
import GPSFinancier from './pages/GPS/GPSFinancier';
import GPSNavigation from './pages/GPS/Navigation/GPSNavigation';
import Objectifs from './pages/Objectifs/Objectifs';
import Simulations from './pages/Simulations/Simulations';
import GestionComptes from './pages/GestionComptes/GestionComptes';
import Parametres from './pages/Parametres/Parametres';
// 🏢 Pages Pro (Enterprise)
import ProLandingPage from './pages/Pro/ProLandingPage';
import ProLogin from './pages/Pro/ProLogin';
import ProDemande from './pages/Pro/ProDemande';

import AdminHome from './pages/Admin/AdminHome';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminAnalysis from './pages/Admin/AdminAnalysis';
import AdminOPEResults from './pages/Admin/AdminOPEResults';

// 📊 Google Analytics
import { initGA, trackPageView } from './services/analytics.service';
import usePageTracking from './hooks/usePageTracking';

// Composant Coming Soon pour pages en développement
const ComingSoon = ({ title }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-day">
    <div className="text-center">
      <h1 className="text-4xl font-header font-bold text-primary-main mb-4">
        🚀 {title}
      </h1>
      <p className="text-xl text-text-secondary">
        En cours de développement...
      </p>
      <div className="mt-8">
        <div className="inline-block animate-pulse-gps">
          <span className="text-6xl">⭕</span>
        </div>
      </div>
    </div>
  </div>
);

function App() {
  // 📊 Initialiser Google Analytics au démarrage
  useEffect(() => {
    initGA();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <UserDataProvider>
            <AppContent />
            {/* 📲 PWA Installation Banner */}
            <InstallPWA />
          </UserDataProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Composant interne pour le tracking des pages (nécessite useLocation)
const PAGE_NAMES = {
  '/': 'Landing Page',
  '/login': 'Login',
  '/register': 'Register',
  '/dashboard': 'Dashboard',
  '/comptes': 'Comptes',
  '/budget': 'Budget',
  '/objectifs': 'Objectifs',
  '/gps': 'GPS Financier',
  '/gps/navigation': 'GPS Navigation',
  '/simulations': 'Simulations',
  '/gestion': 'Gestion Comptes',
  '/parametres': 'Paramètres',
  '/onboarding': 'Onboarding',
  '/admin': 'Admin Home',
  '/admin/optimisation': 'Admin Optimisation'
};

function AppContent() {
  const location = useLocation();

  // 📊 Tracker les pages vues
  useEffect(() => {
    const pageName = PAGE_NAMES[location.pathname] || location.pathname;
    trackPageView(location.pathname, pageName);
  }, [location]);

  return (
        <Routes>
          {/* Routes publiques */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          {/* 🏢 Routes Pro (Enterprise) - publiques */}
          <Route path="/pro" element={<ProLandingPage />} />
          <Route path="/pro/login" element={<ProLogin />} />
          <Route path="/pro/demande" element={<ProDemande />} />
          
          {/* 💳 Routes Stripe (publiques avec redirection) */}
          <Route path="/subscription/success" element={<SubscriptionSuccess />} />
          <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
          
          {/* Route protégée - Onboarding (layout spécial) */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingFlow />
            </ProtectedRoute>
          } />

          {/* Admin Home - Hub central (gère sa propre auth) */}
          <Route path="/admin" element={<AdminHome />} />
          
          {/* Admin Gestion Optimisation */}
          <Route path="/admin/optimisation" element={<AdminDashboard />} />
          
          {/* Route protégée - Admin Analyse/Optimisation */}
          <Route path="/admin/analysis/:requestId" element={
            <ProtectedRoute>
              <AdminAnalysis />
            </ProtectedRoute>
          } />
          
          {/* Route protégée - Admin Résultats OPE */}
          <Route path="/admin/results/:requestId" element={
            <ProtectedRoute>
              <AdminOPEResults />
            </ProtectedRoute>
          } />

          {/* Routes protégées avec MainLayout (Sidebar + Header) */}
          <Route element={<ProtectedMainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/comptes" element={<Comptes />} />
            <Route path="/budget" element={<Budget />} />
            {/* 🧭 GPS: Navigation mode activé */}
            <Route path="/gps" element={<GPSFinancier navigationMode={true} />} />
            <Route path="/gps/navigation" element={<GPSFinancier navigationMode={true} />} />
            <Route path="/gps/itineraire" element={<GPSFinancier />} />
            {/* 🎯 GPS What-If Modes */}
            <Route path="/gps/fondations" element={<GPSFinancier navigationMode={true} whatIfMode="foundations" />} />
            <Route path="/gps/smart-route" element={<GPSFinancier navigationMode={true} whatIfMode="smartRoute" />} />
            <Route path="/objectifs" element={<Objectifs />} />
            <Route path="/simulations" element={<Simulations />} />
            <Route path="/gestion-comptes" element={<GestionComptes />} />
            <Route path="/parametres" element={<Parametres />} />
            <Route path="/planification-evenement" element={<PlanificationEvenement />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
  );
}

export default App;