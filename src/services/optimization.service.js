// 🔐 OPTIMIZATION REQUEST SERVICE - Communication avec l'API Admin
// Gère les demandes d'optimisation (utilisateur + admin)

import axios from 'axios';
import { API_BASE_URL } from '../config/API';
import { storage } from '../utils';

// API pour les appels utilisateur (token utilisateur normal)
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s pour supporter allDayData volumineux
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur utilisateur: utilise le token utilisateur
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

// API pour les appels admin (token admin séparé)
const adminApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur admin: utilise le token admin séparé
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pl4to_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const optimizationService = {
  // ============================================
  // ROUTES UTILISATEUR
  // ============================================

  /**
   * Créer une nouvelle demande d'optimisation
   * @param {Array} allDayData - Données de trajectoire calculées côté frontend
   * @returns {Promise<Object>} { success, requestId, status, createdAt }
   */
  createRequest: async (allDayData = null) => {
    try {
      const response = await api.post('/api/optimization-requests', { allDayData });
      console.log('[OptimizationService] Demande créée:', response.data);
      return response.data;
    } catch (error) {
      console.error('[OptimizationService] Erreur création:', error);
      throw error.response?.data || { error: 'Erreur lors de la création de la demande' };
    }
  },

  /**
   * Récupérer toutes mes demandes
   * @returns {Promise<Array>} Liste des demandes
   */
  getMyRequests: async () => {
    try {
      const response = await api.get('/api/optimization-requests/my-requests');
      return response.data.requests;
    } catch (error) {
      console.error('[OptimizationService] Erreur récupération mes demandes:', error);
      throw error.response?.data || { error: 'Erreur serveur' };
    }
  },

  /**
   * Récupérer ma demande active (pending, analyzing, ou proposal_ready)
   * @returns {Promise<Object>} { hasActiveRequest, request }
   */
  getActiveRequest: async () => {
    try {
      const response = await api.get('/api/optimization-requests/active');
      return response.data;
    } catch (error) {
      console.error('[OptimizationService] Erreur récupération demande active:', error);
      throw error.response?.data || { error: 'Erreur serveur' };
    }
  },

  /**
   * Répondre à une proposition (accepter ou refuser)
   * @param {string} requestId - ID de la demande (OPT-XXXX-XXX-XXXX)
   * @param {string} response - 'accepted' ou 'rejected'
   * @param {string} feedback - Commentaire optionnel
   * @returns {Promise<Object>}
   */
  respondToProposal: async (requestId, response, feedback = null) => {
    try {
      const result = await api.put(`/api/optimization-requests/${requestId}/respond`, {
        response,
        feedback
      });
      console.log('[OptimizationService] Réponse envoyée:', result.data);
      return result.data;
    } catch (error) {
      console.error('[OptimizationService] Erreur réponse:', error);
      throw error.response?.data || { error: 'Erreur serveur' };
    }
  },

  /**
   * Annuler ma demande en cours
   * @param {string} requestId - ID de la demande
   * @returns {Promise<Object>}
   */
  cancelRequest: async (requestId) => {
    try {
      const response = await api.delete(`/api/optimization-requests/${requestId}`);
      console.log('[OptimizationService] Demande annulée:', requestId);
      return response.data;
    } catch (error) {
      console.error('[OptimizationService] Erreur annulation:', error);
      throw error.response?.data || { error: 'Erreur serveur' };
    }
  },

  /**
   * Vérifier si l'utilisateur actuel est admin
   * @returns {Promise<boolean>}
   */
  checkIsAdmin: async () => {
    try {
      const response = await adminApi.get('/api/optimization-requests/check-admin');
      return response.data.isAdmin;
    } catch (error) {
      console.error('[OptimizationService] Erreur vérification admin:', error);
      return false;
    }
  },

  // ============================================
  // ROUTES ADMIN
  // ============================================

  /**
   * [ADMIN] Récupérer toutes les demandes
   * @param {Object} options - { status, sortBy, sortOrder }
   * @returns {Promise<Object>} { requests, stats }
   */
  adminGetAllRequests: async (options = {}) => {
    try {
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);

      const response = await adminApi.get(`/api/optimization-requests/admin/all?${params}`);
      return response.data;
    } catch (error) {
      console.error('[OptimizationService] Erreur admin liste:', error);
      throw error.response?.data || { error: 'Erreur serveur' };
    }
  },

  /**
   * [ADMIN] Récupérer les stats du dashboard
   * @returns {Promise<Object>} Stats globales
   */
  adminGetStats: async () => {
    try {
      const response = await adminApi.get('/api/optimization-requests/admin/dashboard/stats');
      return response.data.stats;
    } catch (error) {
      console.error('[OptimizationService] Erreur admin stats:', error);
      throw error.response?.data || { error: 'Erreur serveur' };
    }
  },

  /**
   * [ADMIN] Récupérer les détails d'une demande
   * @param {string} requestId - ID de la demande
   * @returns {Promise<Object>} Détails complets
   */
  adminGetRequestDetails: async (requestId) => {
    try {
      const response = await adminApi.get(`/api/optimization-requests/admin/${requestId}`);
      return response.data.request;
    } catch (error) {
      console.error('[OptimizationService] Erreur admin détails:', error);
      throw error.response?.data || { error: 'Erreur serveur' };
    }
  },

  /**
   * [ADMIN] Récupérer données fraîches vs snapshot
   * @param {string} requestId - ID de la demande
   * @returns {Promise<Object>} { snapshot, currentData, hasChanges }
   */
  adminGetFreshData: async (requestId) => {
    try {
      const response = await adminApi.get(`/api/optimization-requests/admin/${requestId}/fresh-data`);
      return response.data;
    } catch (error) {
      console.error('[OptimizationService] Erreur admin fresh data:', error);
      throw error.response?.data || { error: 'Erreur serveur' };
    }
  },

  /**
   * [ADMIN] Mettre à jour le snapshot avec les données actuelles
   * @param {string} requestId - ID de la demande
   * @returns {Promise<Object>}
   */
  adminRefreshSnapshot: async (requestId) => {
    try {
      const response = await adminApi.put(`/api/optimization-requests/admin/${requestId}/refresh-snapshot`);
      return response.data;
    } catch (error) {
      console.error('[OptimizationService] Erreur admin refresh snapshot:', error);
      throw error.response?.data || { error: 'Erreur serveur' };
    }
  },

  /**
   * [ADMIN] Commencer l'analyse d'une demande
   * @param {string} requestId - ID de la demande
   * @returns {Promise<Object>}
   */
  adminStartAnalysis: async (requestId) => {
    try {
      const response = await adminApi.put(`/api/optimization-requests/admin/${requestId}/start-analysis`);
      return response.data;
    } catch (error) {
      console.error('[OptimizationService] Erreur admin start analysis:', error);
      throw error.response?.data || { error: 'Erreur serveur' };
    }
  },

  /**
   * [ADMIN] Sauvegarder les résultats d'analyse
   * @param {string} requestId - ID de la demande
   * @param {Object} analysisData - { imbalances, trajectoryIssues, analysisNotes }
   * @returns {Promise<Object>}
   */
  adminSaveAnalysis: async (requestId, analysisData) => {
    try {
      const response = await adminApi.put(`/api/optimization-requests/admin/${requestId}/save-analysis`, analysisData);
      return response.data;
    } catch (error) {
      console.error('[OptimizationService] Erreur admin save analysis:', error);
      throw error.response?.data || { error: 'Erreur serveur' };
    }
  },

  /**
   * [ADMIN] Envoyer une proposition à l'utilisateur
   * @param {string} requestId - ID de la demande
   * @param {Object} proposalData - { proposalMessage, proposedChanges, projectedImpact }
   * @returns {Promise<Object>}
   */
  adminSendProposal: async (requestId, proposalData) => {
    try {
      const response = await adminApi.put(`/api/optimization-requests/admin/${requestId}/send-proposal`, proposalData);
      return response.data;
    } catch (error) {
      console.error('[OptimizationService] Erreur admin send proposal:', error);
      throw error.response?.data || { error: 'Erreur serveur' };
    }
  },

  /**
   * [ADMIN] Supprimer une demande
   * @param {string} requestId - ID de la demande
   * @returns {Promise<Object>}
   */
  adminDeleteRequest: async (requestId) => {
    try {
      const response = await adminApi.delete(`/api/optimization-requests/admin/${requestId}`);
      console.log('[OptimizationService] Demande supprimée:', requestId);
      return response.data;
    } catch (error) {
      console.error('[OptimizationService] Erreur admin delete:', error);
      throw error.response?.data || { error: 'Erreur serveur' };
    }
  }
};

export default optimizationService;
