// 💳 SERVICE STRIPE - Gestion des paiements
// PL4TO - GPS Financier

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Price IDs (doivent correspondre à ceux dans le backend)
export const STRIPE_PRICES = {
  ESSENTIAL_BETA: 'price_1SwWAhC6vOoAdA7m8w4ChrTs',  // $5.99/mois - Beta Founders Promo
  ESSENTIAL: 'price_1SqfwAC6vOoAdA7mtLw3fMmT',      // $9.99/mois - Prix régulier
  PRO: 'price_1Sqfz2C6vOoAdA7mcaOwT0mP'             // $14.99/mois - Pro + IA
};

/**
 * Crée une session Stripe Checkout et redirige vers la page de paiement
 * @param {string} priceId - ID du prix Stripe
 * @param {string} userId - ID de l'utilisateur
 * @param {string} userEmail - Email de l'utilisateur
 * @param {boolean} isBetaFounder - Est-ce un Beta Founder?
 */
export const createCheckoutSession = async (priceId, userId, userEmail, isBetaFounder = false) => {
  try {
    const response = await fetch(`${API_URL}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        priceId,
        userId,
        userEmail,
        isBetaFounder
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la création de la session');
    }

    // Rediriger vers Stripe Checkout
    if (data.url) {
      window.location.href = data.url;
    }

    return data;
  } catch (error) {
    console.error('[💳 Stripe] Erreur checkout:', error);
    throw error;
  }
};

/**
 * Ouvre le portail client Stripe pour gérer l'abonnement
 * @param {string} userEmail - Email de l'utilisateur
 */
export const openCustomerPortal = async (userEmail) => {
  try {
    const response = await fetch(`${API_URL}/api/stripe/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userEmail })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de l\'ouverture du portail');
    }

    // Rediriger vers le portail Stripe
    if (data.url) {
      window.location.href = data.url;
    }

    return data;
  } catch (error) {
    console.error('[💳 Stripe] Erreur portal:', error);
    throw error;
  }
};

/**
 * Récupère le statut d'abonnement de l'utilisateur
 * @param {string} userEmail - Email de l'utilisateur
 */
export const getSubscriptionStatus = async (userEmail) => {
  try {
    const response = await fetch(`${API_URL}/api/stripe/subscription-status?userEmail=${encodeURIComponent(userEmail)}`);
    
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la récupération du statut');
    }

    return data;
  } catch (error) {
    console.error('[💳 Stripe] Erreur status:', error);
    throw error;
  }
};

/**
 * Récupère les prix disponibles
 */
export const getPrices = async () => {
  try {
    const response = await fetch(`${API_URL}/api/stripe/prices`);
    const data = await response.json();
    return data.prices;
  } catch (error) {
    console.error('[💳 Stripe] Erreur prices:', error);
    throw error;
  }
};

export default {
  STRIPE_PRICES,
  createCheckoutSession,
  openCustomerPortal,
  getSubscriptionStatus,
  getPrices
};
