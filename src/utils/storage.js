import { STORAGE_KEYS } from '@/config/constants';

/**
 * Utilitaires pour gérer localStorage de manière sûre
 */

/**
 * Sauvegarder une valeur dans localStorage
 * @param {string} key - Clé de stockage
 * @param {any} value - Valeur à stocker
 */
export const setItem = (key, value) => {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
};

/**
 * Récupérer une valeur de localStorage
 * @param {string} key - Clé de stockage
 * @param {any} defaultValue - Valeur par défaut si non trouvée
 * @returns {any} Valeur désérialisée ou defaultValue
 */
export const getItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
};

/**
 * Supprimer une valeur de localStorage
 * @param {string} key - Clé de stockage
 */
export const removeItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
  }
};

/**
 * Vider tout le localStorage
 */
export const clear = () => {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

/**
 * Sauvegarder le token d'authentification
 * @param {string} token
 */
export const saveAuthToken = (token) => {
  // ✅ Protection: Ne pas sauvegarder un token invalide
  if (!token || typeof token !== 'string') {
    console.error('[Storage] Tentative de sauvegarder un token invalide:', token);
    return;
  }
  setItem(STORAGE_KEYS.AUTH_TOKEN, token);
};

/**
 * Récupérer le token d'authentification
 * @returns {string|null}
 */
export const getAuthToken = () => {
  return getItem(STORAGE_KEYS.AUTH_TOKEN);
};

/**
 * Supprimer le token d'authentification
 */
export const removeAuthToken = () => {
  removeItem(STORAGE_KEYS.AUTH_TOKEN);
};

/**
 * Sauvegarder les données utilisateur
 * @param {Object} userData
 */
export const saveUserData = (userData) => {
  setItem(STORAGE_KEYS.USER_DATA, userData);
};

/**
 * Récupérer les données utilisateur
 * @returns {Object|null}
 */
export const getUserData = () => {
  return getItem(STORAGE_KEYS.USER_DATA);
};

/**
 * Supprimer les données utilisateur
 */
export const removeUserData = () => {
  removeItem(STORAGE_KEYS.USER_DATA);
};

/**
 * Vérifier si l'utilisateur est authentifié
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!getAuthToken();
};