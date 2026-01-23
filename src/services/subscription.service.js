// 💎 SUBSCRIPTION SERVICE - API calls pour gestion des abonnements
// Source de vérité: Supabase (pas localStorage)

import { storage } from '../utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper pour les headers d'authentification
const getAuthHeaders = () => {
  // Utiliser storage.getAuthToken() qui fait JSON.parse() automatiquement
  const token = storage.getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

const subscriptionService = {
  /**
   * Récupérer le statut de subscription actuel
   * @returns {Promise<Object>} subscription data
   */
  async getStatus() {
    try {
      const response = await fetch(`${API_URL}/api/subscription`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la récupération du statut');
      }

      const data = await response.json();
      console.log('[SubscriptionService] Statut récupéré:', data.subscription);
      return data.subscription;
    } catch (error) {
      console.error('[SubscriptionService] Erreur getStatus:', error);
      throw error;
    }
  },

  /**
   * Démarrer le trial de 14 jours
   * @returns {Promise<Object>} subscription data avec trial activé
   */
  async startTrial() {
    try {
      const response = await fetch(`${API_URL}/api/subscription/start-trial`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        // Si trial déjà utilisé, ce n'est pas une erreur fatale
        if (response.status === 400 && data.error === 'Trial déjà utilisé') {
          console.warn('[SubscriptionService] Trial déjà utilisé');
          return null;
        }
        throw new Error(data.error || 'Erreur lors du démarrage du trial');
      }

      console.log('[SubscriptionService] Trial démarré:', data.subscription);
      return data.subscription;
    } catch (error) {
      console.error('[SubscriptionService] Erreur startTrial:', error);
      throw error;
    }
  },

  /**
   * Choisir un plan (fin du trial)
   * @param {string} plan - 'discovery', 'essential', ou 'pro'
   * @returns {Promise<Object>} subscription data mise à jour
   */
  async choosePlan(plan) {
    try {
      const response = await fetch(`${API_URL}/api/subscription/choose-plan`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du choix du plan');
      }

      const data = await response.json();
      console.log('[SubscriptionService] Plan choisi:', data.subscription);
      return data.subscription;
    } catch (error) {
      console.error('[SubscriptionService] Erreur choosePlan:', error);
      throw error;
    }
  },

  /**
   * Activer le statut Beta Founder
   * @returns {Promise<boolean>} true si activé
   */
  async activateBetaFounder() {
    try {
      const response = await fetch(`${API_URL}/api/subscription/activate-beta-founder`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'activation Beta Founder');
      }

      const data = await response.json();
      console.log('[SubscriptionService] Beta Founder activé');
      return data.isBetaFounder;
    } catch (error) {
      console.error('[SubscriptionService] Erreur activateBetaFounder:', error);
      throw error;
    }
  },

  /**
   * Synchroniser les données localStorage vers Supabase (migration unique)
   * @param {Object} localData - Données du localStorage à migrer
   * @returns {Promise<Object>} résultat de la migration
   */
  async syncFromLocalStorage(localData) {
    try {
      const response = await fetch(`${API_URL}/api/subscription/sync`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ localData })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la synchronisation');
      }

      const data = await response.json();
      console.log('[SubscriptionService] Sync résultat:', data);
      return data;
    } catch (error) {
      console.error('[SubscriptionService] Erreur sync:', error);
      throw error;
    }
  },

  /**
   * Récupérer les stats admin (admin only)
   * @returns {Promise<Object>} stats
   */
  async getAdminStats() {
    try {
      const response = await fetch(`${API_URL}/api/subscription/admin/stats`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la récupération des stats');
      }

      const data = await response.json();
      return data.stats;
    } catch (error) {
      console.error('[SubscriptionService] Erreur getAdminStats:', error);
      throw error;
    }
  }
};

export default subscriptionService;
