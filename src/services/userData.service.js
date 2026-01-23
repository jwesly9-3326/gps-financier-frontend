// 🎯 USER DATA SERVICE - Synchronisation avec le backend
// Gère les appels API pour les données utilisateur

import axios from 'axios';
import { API_BASE_URL } from '../config/API';
import { storage } from '../utils';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
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

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn('[UserData Service] Token invalide ou expiré');
      // Ne pas déconnecter automatiquement, laisser le composant gérer
    }
    return Promise.reject(error);
  }
);

const userDataService = {
  /**
   * Récupérer toutes les données utilisateur du backend
   * @returns {Promise<Object|null>} Les données utilisateur ou null si non trouvées
   */
  fetchUserData: async () => {
    try {
      const response = await api.get('/api/user-data');
      console.log('[UserData Service] Données récupérées du backend');
      return response.data.data;
    } catch (error) {
      console.error('[UserData Service] Erreur fetch:', error);
      throw error;
    }
  },

  /**
   * Sauvegarder toutes les données utilisateur dans le backend
   * @param {Object} data - Toutes les données utilisateur
   * @returns {Promise<Object>} Les données sauvegardées
   */
  saveUserData: async (data) => {
    try {
      const response = await api.post('/api/user-data', data);
      console.log('[UserData Service] Données sauvegardées dans le backend');
      return response.data.data;
    } catch (error) {
      console.error('[UserData Service] Erreur save:', error);
      throw error;
    }
  },

  /**
   * Mettre à jour une section spécifique des données utilisateur
   * @param {string} section - La section à mettre à jour (userInfo, accounts, etc.)
   * @param {any} data - Les nouvelles données pour cette section
   * @returns {Promise<any>} Les données de la section mise à jour
   */
  updateSection: async (section, data) => {
    try {
      const response = await api.patch(`/api/user-data/${section}`, { data });
      console.log(`[UserData Service] Section ${section} mise à jour`);
      return response.data.data;
    } catch (error) {
      console.error(`[UserData Service] Erreur update section ${section}:`, error);
      throw error;
    }
  },

  /**
   * Supprimer toutes les données utilisateur
   * @returns {Promise<void>}
   */
  deleteUserData: async () => {
    try {
      await api.delete('/api/user-data');
      console.log('[UserData Service] Données supprimées du backend');
    } catch (error) {
      console.error('[UserData Service] Erreur delete:', error);
      throw error;
    }
  },

  /**
   * Synchroniser les données locales avec le backend
   * - Si des données existent dans le backend, les utiliser
   * - Sinon, sauvegarder les données locales dans le backend
   * @param {Object} localData - Les données locales (localStorage)
   * @returns {Promise<Object>} Les données synchronisées
   */
  syncWithBackend: async (localData) => {
    try {
      // 1. Essayer de récupérer les données du backend
      const backendData = await userDataService.fetchUserData();
      
      if (backendData) {
        console.log('[UserData Service] Utilisation des données du backend');
        return backendData;
      }
      
      // 2. Si pas de données backend mais des données locales, les sauvegarder
      if (localData && Object.keys(localData).length > 0) {
        console.log('[UserData Service] Migration des données locales vers le backend');
        await userDataService.saveUserData(localData);
        return localData;
      }
      
      // 3. Aucune donnée disponible
      console.log('[UserData Service] Aucune donnée disponible');
      return null;
      
    } catch (error) {
      console.error('[UserData Service] Erreur sync:', error);
      // En cas d'erreur réseau, retourner les données locales comme fallback
      if (localData) {
        console.log('[UserData Service] Fallback vers données locales');
        return localData;
      }
      throw error;
    }
  },

  /**
   * Vérifier si l'utilisateur est connecté (a un token valide)
   * @returns {boolean}
   */
  isAuthenticated: () => {
    return !!storage.getAuthToken();
  }
};

export default userDataService;
