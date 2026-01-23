// 🎯 GPS FINANCIER - MINI CALENDRIER (3 prochains événements)

import React from 'react';

const MiniCalendrier = ({ evenements, onClickEvenement }) => {
  // Prendre les 3 prochains (en excluant le principal qui est déjà affiché)
  const miniEvenements = evenements.slice(1, 4);

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {miniEvenements.map((evenement, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-md p-3 cursor-pointer transition-all hover:shadow-lg hover:scale-105"
          onClick={() => onClickEvenement(evenement)}
          style={{ borderTop: `3px solid ${evenement.couleur}` }}
        >
          {/* Emoji grand */}
          <div className="text-center mb-2">
            <span className="text-4xl">{evenement.emoji}</span>
          </div>

          {/* Date */}
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">
              {evenement.date.toLocaleDateString('fr-CA', { month: 'short' }).toUpperCase()}
            </p>
            <p className="text-2xl font-bold" style={{ color: evenement.couleur }}>
              {evenement.jour}
            </p>
          </div>

          {/* Jours restants */}
          <div className="text-center mt-2">
            <p className="text-xs text-gray-600">
              Dans {evenement.joursRestants}j
            </p>
          </div>

          {/* Badge si urgent */}
          {evenement.urgent && (
            <div className="mt-2 text-center">
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-semibold">
                Bientôt
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MiniCalendrier;