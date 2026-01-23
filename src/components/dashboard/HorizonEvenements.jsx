// 🎯 GPS FINANCIER - HORIZON DES ÉVÉNEMENTS
// Composant principal qui orchestre l'affichage des événements

import React, { useState, useEffect } from 'react';
import { obtenirTop5Evenements, obtenirEvenementPrincipal } from '../../utils/evenements';
import CardEvenement from './CardEvenement';
import MiniCalendrier from './MiniCalendrier';

const HorizonEvenements = () => {
  const [evenementPrincipal, setEvenementPrincipal] = useState(null);
  const [tousEvenements, setTousEvenements] = useState([]);

  // Charger les événements au montage du composant
  useEffect(() => {
    chargerEvenements();
    
    // Mettre à jour toutes les heures (optionnel, pour vraiment dynamique)
    const interval = setInterval(chargerEvenements, 3600000); // 1 heure
    
    return () => clearInterval(interval);
  }, []);

  const chargerEvenements = () => {
    const principal = obtenirEvenementPrincipal();
    const top5 = obtenirTop5Evenements();
    
    setEvenementPrincipal(principal);
    setTousEvenements(top5);
  };

  const handleClickEvenement = (evenement) => {
    // TODO: Naviguer vers le GPS à cette date
    console.log('Clic sur événement:', evenement);
    // Navigation future: navigate(`/gps?date=${evenement.date}`);
  };

  if (!evenementPrincipal) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Titre de la section */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-3xl">🔮</span>
        <h2 className="text-2xl font-bold text-gray-800">
          Horizon des Événements
        </h2>
      </div>

      {/* Card principale - Événement le plus proche */}
      <CardEvenement 
        evenement={evenementPrincipal}
        onClick={() => handleClickEvenement(evenementPrincipal)}
        isPrincipal={true}
      />

      {/* Mini calendrier - 3 prochains événements */}
      {tousEvenements.length > 1 && (
        <>
          <div className="flex items-center gap-2 mb-3 mt-6">
            <span className="text-xl">📅</span>
            <h3 className="text-lg font-semibold text-gray-700">
              Prochainement
            </h3>
          </div>
          <MiniCalendrier 
            evenements={tousEvenements}
            onClickEvenement={handleClickEvenement}
          />
        </>
      )}

      {/* Message encourageant */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <p className="text-sm text-blue-800">
          💡 <span className="font-semibold">Conseil:</span> Planifiez vos dépenses à l'avance pour éviter les surprises! 
          Utilisez le GPS pour voir l'impact de {evenementPrincipal.nom} sur vos finances.
        </p>
      </div>
    </div>
  );
};

export default HorizonEvenements;