// 🔔 TRIAL SERVICE
// Service pour gérer les rappels trial via l'API backend

import axios from 'axios';
import { API_BASE_URL, TRIAL_ENDPOINTS } from '../config/API';
import { storage } from '../utils';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token
api.interceptors.request.use(
  (config) => {
    const token = storage.getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const trialService = {
  /**
   * Récupérer le statut des rappels trial
   * @returns {Promise<Object>} { trial, reminders, showPopup }
   */
  getStatus: async () => {
    try {
      const response = await api.get(TRIAL_ENDPOINTS.STATUS);
      console.log('[Trial Service] 📊 Status récupéré:', response.data.showPopup);
      return response.data;
    } catch (error) {
      console.error('[Trial Service] ❌ Erreur getStatus:', error);
      throw error;
    }
  },

  /**
   * Enregistrer une action utilisateur
   * @param {string} action - 'welcome_shown' | 'ignore' | 'remind_7days' | 'remind_7days_shown' | 'remind_2days_shown' | 'plan_chosen'
   * @returns {Promise<Object>}
   */
  recordAction: async (action) => {
    try {
      const response = await api.post(TRIAL_ENDPOINTS.ACTION, { action });
      console.log(`[Trial Service] ✅ Action '${action}' enregistrée`);
      return response.data;
    } catch (error) {
      console.error(`[Trial Service] ❌ Erreur action '${action}':`, error);
      throw error;
    }
  },

  // ===== Helpers pour les actions spécifiques =====

  /**
   * Marquer le popup initial comme vu (action: 'ignore')
   */
  markWelcomeIgnored: async () => {
    return trialService.recordAction('ignore');
  },

  /**
   * Programmer un rappel dans 7 jours
   */
  scheduleReminder7Days: async () => {
    return trialService.recordAction('remind_7days');
  },

  /**
   * Marquer le rappel 7 jours comme affiché
   */
  markReminder7DaysShown: async () => {
    return trialService.recordAction('remind_7days_shown');
  },

  /**
   * Marquer le rappel 2 jours comme affiché
   */
  markReminder2DaysShown: async () => {
    return trialService.recordAction('remind_2days_shown');
  },

  /**
   * Marquer qu'un plan a été choisi (désactive tous les rappels)
   */
  markPlanChosen: async () => {
    return trialService.recordAction('plan_chosen');
  },
};

export default trialService;
