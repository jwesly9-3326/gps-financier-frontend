// 🏢 ENTERPRISE SERVICE - Communication avec l'API Enterprise
// Gère les appels API pour PL4TO Entreprise (organizations, clients, dashboard)

import axios from 'axios';
import { API_BASE_URL, ENTERPRISE_ENDPOINTS } from '../config/API';
import { storage } from '../utils';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
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

const enterpriseService = {
  // ============================================
  // CHECK - Vérifier si l'utilisateur a une organisation
  // ============================================
  checkOrganization: async () => {
    try {
      const response = await api.get(ENTERPRISE_ENDPOINTS.CHECK);
      return response.data;
    } catch (error) {
      console.error('[Enterprise Service] Erreur check:', error);
      return { success: false, hasOrganization: false };
    }
  },

  // ============================================
  // ORGANISATION
  // ============================================
  getOrganization: async () => {
    const response = await api.get(ENTERPRISE_ENDPOINTS.ORGANIZATION);
    return response.data;
  },

  updateOrganization: async (data) => {
    const response = await api.put(ENTERPRISE_ENDPOINTS.ORGANIZATION, data);
    return response.data;
  },

  // ============================================
  // MEMBRES
  // ============================================
  getMembers: async () => {
    const response = await api.get(ENTERPRISE_ENDPOINTS.MEMBERS);
    return response.data;
  },

  inviteMember: async ({ email, role, title }) => {
    const response = await api.post(ENTERPRISE_ENDPOINTS.MEMBERS_INVITE, { email, role, title });
    return response.data;
  },

  removeMember: async (memberId) => {
    const response = await api.delete(ENTERPRISE_ENDPOINTS.MEMBER_DELETE(memberId));
    return response.data;
  },

  // ============================================
  // CLIENTS
  // ============================================
  getClients: async (params = {}) => {
    const response = await api.get(ENTERPRISE_ENDPOINTS.CLIENTS, { params });
    return response.data;
  },

  getClientDetail: async (clientId) => {
    const response = await api.get(ENTERPRISE_ENDPOINTS.CLIENT_DETAIL(clientId));
    return response.data;
  },

  createClient: async (clientData) => {
    const response = await api.post(ENTERPRISE_ENDPOINTS.CLIENTS, clientData);
    return response.data;
  },

  updateClient: async (clientId, data) => {
    const response = await api.put(ENTERPRISE_ENDPOINTS.CLIENT_DETAIL(clientId), data);
    return response.data;
  },

  // 🔑 Route critique: sauvegarde les données financières du client
  // Appelée quand le conseiller modifie le budget/comptes/objectifs d'un client
  saveClientSnapshot: async (clientId, userDataSnapshot) => {
    const response = await api.put(ENTERPRISE_ENDPOINTS.CLIENT_SNAPSHOT(clientId), { userDataSnapshot });
    return response.data;
  },

  archiveClient: async (clientId) => {
    const response = await api.delete(ENTERPRISE_ENDPOINTS.CLIENT_DELETE(clientId));
    return response.data;
  },

  // ============================================
  // DASHBOARD
  // ============================================
  getDashboard: async () => {
    const response = await api.get(ENTERPRISE_ENDPOINTS.DASHBOARD);
    return response.data;
  },
};

export default enterpriseService;
