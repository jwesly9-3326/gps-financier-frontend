import axios from 'axios';
import { API_BASE_URL, AUTH_ENDPOINTS } from '../config/API';
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

const authService = {
  // Connexion
  login: async (email, password) => {
    // ⚠️ NE PAS effacer les données ici - le UserDataContext gère la sync avec le backend
    // Les données seront rechargées depuis le backend après login
    
    const response = await api.post(AUTH_ENDPOINTS.LOGIN, { email, password });
    const { token, user } = response.data;
    
    storage.saveAuthToken(token);
    storage.saveUserData(user);
    
    return response.data;
  },

  // Inscription
  register: async (userData) => {
    // 🔧 FIX: Reset COMPLET pour nouvelle inscription (efface guide + trial)
    authService.clearUserData(true);
    
    const response = await api.post(AUTH_ENDPOINTS.REGISTER, userData);
    const { token, user, requiresVerification, email } = response.data;
    
    // 📧 Si vérification email requise, retourner sans token
    if (requiresVerification) {
      console.log('[Auth Service] 📧 Vérification email requise pour:', email);
      return response.data; // { requiresVerification: true, email: "..." }
    }
    
    // ✅ Validation: Vérifier que le token existe (cas sans vérification email)
    if (!token) {
      console.error('[Auth Service] ❌ Backend n\'a pas retourné de token!');
      throw new Error('Erreur serveur: token manquant');
    }
    
    storage.saveAuthToken(token);
    storage.saveUserData(user);
    
    console.log('[Auth Service] ✅ Inscription réussie, token sauvegardé');
    
    return response.data;
  },

  // 🧹 Fonction utilitaire: Nettoyer les données utilisateur
  // @param {boolean} fullReset - Si true, efface TOUT (pour nouvelle inscription)
  //                              Si false, garde le guide et trial (pour logout)
  clearUserData: (fullReset = false) => {
    // Données onboarding (toujours effacées)
    localStorage.removeItem('pl4to-onboarding');
    localStorage.removeItem('pl4to-onboarding-step');
    localStorage.removeItem('pl4to-user-data');
    
    // Données abonnement/usage et guide - seulement si fullReset
    if (fullReset) {
      // Données abonnement/usage
      localStorage.removeItem('pl4to_subscription_usage');
      localStorage.removeItem('pl4to_subscription_plan');
      localStorage.removeItem('pl4to_trial_info');
      localStorage.removeItem('pl4to_trial_welcome');
      
      // Données du guide (8 pages)
      localStorage.removeItem('pl4to-guide-dashboard');
      localStorage.removeItem('pl4to-guide-comptes');
      localStorage.removeItem('pl4to-guide-budget');
      localStorage.removeItem('pl4to-guide-objectifs');
      localStorage.removeItem('pl4to-guide-gps');
      localStorage.removeItem('pl4to-guide-calculatrice');
      localStorage.removeItem('pl4to-guide-gestion');
      localStorage.removeItem('pl4to-guide-parametres');
      
      console.log('🧹 clearUserData: Reset COMPLET (nouvelle inscription)');
    } else {
      console.log('🧹 clearUserData: Données session nettoyées (guide préservé)');
    }
  },

  // Déconnexion
  logout: () => {
    storage.removeAuthToken();
    storage.removeUserData();
    
    // 🔧 Nettoyer toutes les données utilisateur
    authService.clearUserData();
    
    console.log('🚪 Logout: Déconnexion complète');
  },

  // Récupérer le profil
  getProfile: async () => {
    const response = await api.get(AUTH_ENDPOINTS.PROFILE);
    return response.data;
  },

  // Mettre à jour le profil
  updateProfile: async (userData) => {
    const response = await api.put(AUTH_ENDPOINTS.PROFILE, userData);
    storage.saveUserData(response.data);
    return response.data;
  },

  // ========== 2FA METHODS ==========
  
  // Setup 2FA - Génère QR code et secret
  setup2FA: async () => {
    const response = await api.post('/api/auth/2fa/setup');
    return response.data;
  },

  // Verify 2FA - Vérifie le code et active 2FA
  verify2FA: async (code) => {
    const response = await api.post('/api/auth/2fa/verify', { code });
    return response.data;
  },

  // Validate 2FA - Valide le code au login
  validate2FA: async (email, code, isBackupCode = false) => {
    const response = await api.post('/api/auth/2fa/validate', { 
      email, 
      code,
      isBackupCode 
    });
    
    // Sauvegarder le token si la validation réussit
    if (response.data.token) {
      storage.saveAuthToken(response.data.token);
      storage.saveUserData(response.data.user);
    }
    
    return response.data;
  },

  // Disable 2FA - Désactive 2FA (confirmation par texte SUPPRIMER)
  disable2FA: async () => {
    const response = await api.delete('/api/auth/2fa/disable');
    return response.data;
  },

  // Get 2FA Status
  get2FAStatus: async () => {
    const response = await api.get('/api/auth/2fa/status');
    return response.data;
  },

  // Regenerate backup codes
  regenerateBackupCodes: async (code) => {
    const response = await api.post('/api/auth/2fa/regenerate-backup', { code });
    return response.data;
  },

  // ========== GOOGLE OAUTH ==========
  
  // Login avec Google
  loginWithGoogle: async (credential) => {
    const response = await api.post('/api/auth/google', { credential });
    const { token, user } = response.data;
    
    storage.saveAuthToken(token);
    storage.saveUserData(user);
    
    return response.data;
  },

  // ========== EMAIL VERIFICATION ==========
  
  // Vérifier le code email
  verifyEmail: async (email, code) => {
    const response = await api.post('/api/auth/verify-email', { email, code });
    const { token, user } = response.data;
    
    if (token) {
      storage.saveAuthToken(token);
      storage.saveUserData(user);
    }
    
    return response.data;
  },

  // Renvoyer le code de vérification
  resendCode: async (email) => {
    const response = await api.post('/api/auth/resend-code', { email });
    return response.data;
  },
};

export default authService;
