// 🎯 GPS FINANCIER - SYSTÈME D'ÉVÉNEMENTS DYNAMIQUES
// Date: 11 novembre 2025

// ============================================
// ÉVÉNEMENTS GLOBAUX ANNUELS
// ============================================
export const EVENEMENTS_GLOBAUX = {
  noel: {
    nom: "Noël",
    emoji: "🎄",
    jour: 25,
    mois: 12,
    budgetSuggere: 800,
    animation: "snow",
    couleur: "#C41E3A",
    description: "Période des fêtes et cadeaux"
  },
  saintValentin: {
    nom: "Saint-Valentin",
    emoji: "💝",
    jour: 14,
    mois: 2,
    budgetSuggere: 150,
    animation: "hearts",
    couleur: "#FF1493",
    description: "Fête des amoureux"
  },
  halloween: {
    nom: "Halloween",
    emoji: "🎃",
    jour: 31,
    mois: 10,
    budgetSuggere: 100,
    animation: "pumpkins",
    couleur: "#FF8C00",
    description: "Bonbons et déguisements"
  },
  nouvelAn: {
    nom: "Nouvel An",
    emoji: "🎆",
    jour: 1,
    mois: 1,
    budgetSuggere: 200,
    animation: "fireworks",
    couleur: "#FFD700",
    description: "Célébration du passage à la nouvelle année"
  },
  actionGrace: {
    nom: "Action de Grâce",
    emoji: "🦃",
    jour: 11, // 2e lundi d'octobre au Canada
    mois: 10,
    budgetSuggere: 300,
    animation: "autumn",
    couleur: "#CD853F",
    description: "Repas en famille"
  }
};

// ============================================
// CALCULER PROCHAINE OCCURRENCE D'UN ÉVÉNEMENT
// ============================================
export function calculerProchaineOccurrence(evenement) {
  const aujourdhui = new Date();
  const anneeActuelle = aujourdhui.getFullYear();
  
  // Créer date de l'événement cette année
  let dateEvenement = new Date(anneeActuelle, evenement.mois - 1, evenement.jour);
  
  // Si l'événement est déjà passé cette année, prendre l'année suivante
  if (dateEvenement < aujourdhui) {
    dateEvenement = new Date(anneeActuelle + 1, evenement.mois - 1, evenement.jour);
  }
  
  return dateEvenement;
}

// ============================================
// CALCULER JOURS RESTANTS
// ============================================
export function calculerJoursRestants(dateEvenement) {
  const aujourdhui = new Date();
  const diffMs = dateEvenement - aujourdhui;
  const diffJours = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffJours;
}

// ============================================
// OBTENIR TOUS LES ÉVÉNEMENTS AVEC DATES
// ============================================
export function obtenirEvenementsAvecDates() {
  return Object.values(EVENEMENTS_GLOBAUX).map(evenement => {
    const dateProchaine = calculerProchaineOccurrence(evenement);
    const joursRestants = calculerJoursRestants(dateProchaine);
    
    return {
      ...evenement,
      date: dateProchaine,
      joursRestants: joursRestants,
      urgent: joursRestants <= 30, // Marquer comme urgent si < 30 jours
      tresSoonProche: joursRestants <= 7 // Très urgent si < 7 jours
    };
  });
}

// ============================================
// OBTENIR TOP 5 ÉVÉNEMENTS LES PLUS PROCHES
// ============================================
export function obtenirTop5Evenements() {
  const evenements = obtenirEvenementsAvecDates();
  
  // Trier par nombre de jours restants (du plus proche au plus lointain)
  return evenements
    .sort((a, b) => a.joursRestants - b.joursRestants)
    .slice(0, 5); // Prendre les 5 premiers
}

// ============================================
// OBTENIR L'ÉVÉNEMENT PRINCIPAL (LE PLUS PROCHE)
// ============================================
export function obtenirEvenementPrincipal() {
  const top5 = obtenirTop5Evenements();
  return top5[0]; // Le premier est le plus proche
}

// ============================================
// FORMATER MESSAGE SELON URGENCE
// ============================================
export function formaterMessageUrgence(joursRestants) {
  if (joursRestants === 0) return "C'EST AUJOURD'HUI! 🎉";
  if (joursRestants === 1) return "C'EST DEMAIN! ⏰";
  if (joursRestants <= 7) return `Dans seulement ${joursRestants} jours! ⚠️`;
  if (joursRestants <= 30) return `Dans ${joursRestants} jours 📅`;
  return `Dans ${joursRestants} jours`;
}