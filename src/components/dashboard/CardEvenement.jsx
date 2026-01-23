// 🎯 GPS FINANCIER - CARD ÉVÉNEMENT ANIMÉE
// Affiche un événement avec animation thématique

import React from 'react';
import { formaterMessageUrgence } from '../../utils/evenements';

const CardEvenement = ({ evenement, onClick, isPrincipal = false }) => {
  const { nom, emoji, joursRestants, budgetSuggere, couleur, description, urgent, tresSoonProche } = evenement;

  // Classes CSS selon urgence
  const urgenceClasses = tresSoonProche 
    ? 'border-red-500 border-2 animate-pulse' 
    : urgent 
    ? 'border-orange-500 border-2'
    : 'border-gray-200';

  // Taille selon importance
  const tailleClasses = isPrincipal 
    ? 'p-6 mb-4' 
    : 'p-4';

  return (
    <div 
      className={`
        bg-white rounded-xl shadow-lg cursor-pointer 
        transition-all duration-300 hover:shadow-2xl hover:scale-105
        ${urgenceClasses} ${tailleClasses}
        relative overflow-hidden
      `}
      onClick={onClick}
      style={{ borderColor: urgent ? couleur : undefined }}
    >
      {/* Animation de fond selon le type */}
      {isPrincipal && (
        <div 
          className="absolute inset-0 opacity-5"
          style={{ backgroundColor: couleur }}
        />
      )}

      {/* Contenu principal */}
      <div className="relative z-10">
        {/* Emoji + Nom */}
        <div className="flex items-center gap-3 mb-3">
          <span className={`text-${isPrincipal ? '5xl' : '3xl'}`}>
            {emoji}
          </span>
          <div className="flex-1">
            <h3 className={`font-bold text-${isPrincipal ? 'xl' : 'lg'}`} style={{ color: couleur }}>
              {nom.toUpperCase()}
            </h3>
            {isPrincipal && (
              <p className="text-sm text-gray-600">{description}</p>
            )}
          </div>
        </div>

        {/* Jours restants */}
        <div className="mb-3">
          <p className={`font-semibold text-${isPrincipal ? 'lg' : 'base'}`}>
            {formaterMessageUrgence(joursRestants)}
          </p>
        </div>

        {/* Budget suggéré */}
        {isPrincipal && budgetSuggere && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-gray-600">Budget suggéré</p>
            <p className="text-2xl font-bold" style={{ color: couleur }}>
              {budgetSuggere}$
            </p>
          </div>
        )}

        {/* Actions (seulement si principal) */}
        {isPrincipal && (
          <div className="flex gap-2 mt-4">
            <button 
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Naviguer vers GPS à cette date
              }}
            >
              📊 Voir l'impact GPS
            </button>
            <button 
              className="flex-1 border-2 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              style={{ borderColor: couleur, color: couleur }}
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Créer objectif épargne
              }}
            >
              💡 Planifier
            </button>
          </div>
        )}

        {/* Badge urgent */}
        {tresSoonProche && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
            URGENT
          </div>
        )}
      </div>
    </div>
  );
};

export default CardEvenement;