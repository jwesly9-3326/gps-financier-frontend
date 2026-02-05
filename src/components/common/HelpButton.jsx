// 💡 COMPOSANT - Bouton d'aide pour relancer les tooltips
// Affiche une icône ampoule en bas à droite de la page (mode plein écran uniquement)
// Au clic: relance le tour de tooltips de la page
// IMPORTANT: Ne s'affiche QUE si l'onboarding est terminé

import { useState } from 'react';

const HelpButton = ({ onStartTour, isGuideComplete }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Ne pas afficher si l'onboarding n'est pas terminé
  if (!isGuideComplete) {
    return null;
  }

  const handleClick = () => {
    if (onStartTour) {
      onStartTour();
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: 'none',
        background: 'transparent',
        color: isHovered ? '#667eea' : '#94a3b8',
        fontSize: '32px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'scale(1.15)' : 'scale(1)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: isHovered ? 'drop-shadow(0 4px 12px rgba(102, 126, 234, 0.5))' : 'none'
      }}
      title="Aide - Voir le guide de la page"
      aria-label="Aide - Voir le guide de la page"
    >
      💡
    </button>
  );
};

export default HelpButton;
