/**
 * Constantes globales de l'application
 */

// URL de base de l'API backend
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Clés de stockage localStorage
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'gps_financier_token',
  USER_DATA: 'gps_financier_user',
  THEME: 'gps_financier_theme',
};

// Statuts de comptes
export const COMPTE_TYPES = {
  CHEQUES: 'cheques',
  EPARGNE: 'epargne',
  CREDIT: 'credit',
  INVESTISSEMENT: 'investissement',
};

// Fréquences d'activités
export const FREQUENCES = {
  UNIQUE: 'unique',
  QUOTIDIEN: 'quotidien',
  HEBDOMADAIRE: 'hebdomadaire',
  BIMENSUEL: 'bimensuel',
  MENSUEL: 'mensuel',
  TRIMESTRIEL: 'trimestriel',
  SEMESTRIEL: 'semestriel',
  ANNUEL: 'annuel',
};

// Types d'activités
export const ACTIVITE_TYPES = {
  REVENU: 'revenu',
  DEPENSE: 'depense',
};

// Couleurs par défaut
export const DEFAULT_COLORS = {
  PRIMARY: '#4CAF50',
  SECONDARY: '#2196F3',
  SUCCESS: '#4CAF50',
  WARNING: '#FFC107',
  DANGER: '#F44336',
  INFO: '#2196F3',
};

// Routes de l'application
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  COMPTES: '/comptes',
  BUDGET: '/budget',
  GPS: '/gps',
  OBJECTIFS: '/objectifs',
  PARAMETRES: '/parametres',
};