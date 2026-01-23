import { API_BASE_URL } from './constants';

/**
 * Configuration centralisée des endpoints API
 */

// Re-export API_BASE_URL pour compatibilité
export { API_BASE_URL };

// Endpoints Auth
export const AUTH_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  LOGOUT: '/api/auth/logout',
  PROFILE: '/api/auth/profile',
  CHANGE_PASSWORD: '/api/auth/change-password',
  FORGOT_PASSWORD: '/api/auth/forgot-password',
  RESET_PASSWORD: '/api/auth/reset-password',
};

// Endpoints User Data (sync avec backend)
export const USER_DATA_ENDPOINTS = {
  GET: '/api/user-data',
  SAVE: '/api/user-data',
  UPDATE_SECTION: (section) => `/api/user-data/${section}`,
  DELETE: '/api/user-data',
};

// Endpoints Macros (20 macros)
export const MACRO_ENDPOINTS = {
  MACRO_1_DATE_O: '/api/macro1',
  MACRO_2_COMPTES: '/api/macro2',
  MACRO_3_SOLDE_GLOBAL: '/api/macro3',
  MACRO_4_ACTIVITES: '/api/macro4',
  MACRO_5: '/api/macro5',
  MACRO_6: '/api/macro6',
  MACRO_7: '/api/macro7',
  MACRO_8: '/api/macro8',
  MACRO_9: '/api/macro9',
  MACRO_10: '/api/macro10',
  MACRO_11: '/api/macro11',
  MACRO_12: '/api/macro12',
  MACRO_13: '/api/macro13',
  MACRO_14: '/api/macro14',
  MACRO_15: '/api/macro15',
  MACRO_16: '/api/macro16',
  MACRO_17: '/api/macro17',
  MACRO_18: '/api/macro18',
  MACRO_19: '/api/macro19',
  MACRO_20_GPS: '/api/macro20',
};

// Endpoints Comptes
export const COMPTE_ENDPOINTS = {
  LIST: '/api/comptes',
  CREATE: '/api/comptes',
  GET: (id) => `/api/comptes/${id}`,
  UPDATE: (id) => `/api/comptes/${id}`,
  DELETE: (id) => `/api/comptes/${id}`,
};

// Endpoints Activités
export const ACTIVITE_ENDPOINTS = {
  LIST: '/api/activites',
  CREATE: '/api/activites',
  GET: (id) => `/api/activites/${id}`,
  UPDATE: (id) => `/api/activites/${id}`,
  DELETE: (id) => `/api/activites/${id}`,
};

// Endpoints Objectifs
export const OBJECTIF_ENDPOINTS = {
  LIST: '/api/objectifs',
  CREATE: '/api/objectifs',
  GET: (id) => `/api/objectifs/${id}`,
  UPDATE: (id) => `/api/objectifs/${id}`,
  DELETE: (id) => `/api/objectifs/${id}`,
};

// Endpoints Trial Reminders
export const TRIAL_ENDPOINTS = {
  STATUS: '/api/trial/status',
  ACTION: '/api/trial/action',
};

// Timeout par défaut
export const DEFAULT_TIMEOUT = 10000;

// Headers par défaut
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};