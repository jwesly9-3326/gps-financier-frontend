// 🧭 GPS FINANCIER - MAIN LAYOUT (Structure 100% Fixe)
// Design: Interface type "application dashboard" sans scroll de page
// VERSION MODIFIÉE: Timeline affichée seulement sur GPS Financier

import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Timeline from './Timeline';

const MainLayout = () => {
  const location = useLocation();
  
  // Déterminer si on doit afficher la Timeline
  // Timeline visible seulement sur la page: /gps-financier
  const showTimeline = location.pathname === '/gps-financier' || 
                       location.pathname.startsWith('/gps-financier/');

  return (
    <div className="gps-app-container">
      {/* Header Fixe en Haut */}
      <Header />
      
      <div className="gps-app-body">
        {/* Sidebar Fixe Gauche - Full Height */}
        <Sidebar />
        
        {/* Zone Principale Droite */}
        <div className="gps-main-content">
          {/* Timeline Fixe - Conditionnelle */}
          {showTimeline && <Timeline />}
          
          {/* Zone de Contenu avec Scroll Interne */}
          <div className="gps-content-area">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;