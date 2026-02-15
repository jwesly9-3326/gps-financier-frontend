// 🏢 ENTERPRISE CONTEXT - Gestion du mode PL4TO Entreprise
// Détecte si l'utilisateur a une organisation, gère la sélection client,
// et fournit les données du client sélectionné au reste de l'application.
//
// C'EST LE PONT: quand selectedClient existe, UserDataContext charge les données
// du ClientProfile au lieu du UserData personnel du conseiller.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import enterpriseService from '../services/enterprise.service';
import { useAuth } from './AuthContext';

const EnterpriseContext = createContext(null);

export const useEnterprise = () => {
  const context = useContext(EnterpriseContext);
  if (!context) {
    throw new Error('useEnterprise must be used within EnterpriseProvider');
  }
  return context;
};

// Clé localStorage pour le client sélectionné (persistance entre refresh)
const SELECTED_CLIENT_KEY = 'pl4to-enterprise-selected-client';

export const EnterpriseProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  // ===== ÉTAT ORGANISATION =====
  const [isEnterpriseMode, setIsEnterpriseMode] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [memberRole, setMemberRole] = useState(null); // 'admin', 'advisor', 'viewer'
  const [isLoading, setIsLoading] = useState(true);
  
  // ===== ÉTAT CLIENT SÉLECTIONNÉ =====
  const [selectedClient, setSelectedClientState] = useState(null);
  const [selectedClientData, setSelectedClientData] = useState(null); // userDataSnapshot complet
  const [isLoadingClient, setIsLoadingClient] = useState(false);
  
  // ===== ÉTAT LISTE CLIENTS =====
  const [clients, setClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // ============================================
  // INITIALISATION: Vérifier si l'utilisateur a une organisation
  // ============================================
  useEffect(() => {
    if (isAuthenticated) {
      checkEnterprise();
    } else {
      // Reset si déconnecté
      setIsEnterpriseMode(false);
      setOrganization(null);
      setMemberRole(null);
      setSelectedClientState(null);
      setSelectedClientData(null);
      setClients([]);
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const checkEnterprise = async () => {
    setIsLoading(true);
    try {
      const result = await enterpriseService.checkOrganization();
      
      if (result.success && result.hasOrganization) {
        setIsEnterpriseMode(true);
        setOrganization(result.organization);
        setMemberRole(result.role);
        
        console.log(`[Enterprise] Mode activé: ${result.organization.name} (${result.role})`);
        
        // Restaurer le client sélectionné si présent en localStorage
        const savedClientId = localStorage.getItem(SELECTED_CLIENT_KEY);
        if (savedClientId) {
          await loadClientDetail(savedClientId);
        }
      } else {
        setIsEnterpriseMode(false);
        setOrganization(null);
        setMemberRole(null);
      }
    } catch (error) {
      console.error('[Enterprise] Erreur check:', error);
      setIsEnterpriseMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // SÉLECTION CLIENT
  // ============================================
  const selectClient = useCallback(async (client) => {
    if (!client) {
      // Désélectionner = retour au mode personnel
      setSelectedClientState(null);
      setSelectedClientData(null);
      localStorage.removeItem(SELECTED_CLIENT_KEY);
      console.log('[Enterprise] Client désélectionné → mode personnel');
      return;
    }
    
    setSelectedClientState(client);
    localStorage.setItem(SELECTED_CLIENT_KEY, client.id);
    
    // Charger les données complètes du client
    await loadClientDetail(client.id);
  }, []);

  const loadClientDetail = async (clientId) => {
    setIsLoadingClient(true);
    try {
      const result = await enterpriseService.getClientDetail(clientId);
      
      if (result.success && result.client) {
        setSelectedClientState({
          id: result.client.id,
          prenom: result.client.prenom,
          nom: result.client.nom,
          email: result.client.email,
          status: result.client.status
        });
        setSelectedClientData(result.client.userDataSnapshot || null);
        console.log(`[Enterprise] Client chargé: ${result.client.prenom} ${result.client.nom}`);
      } else {
        // Client pas trouvé (supprimé?), reset
        setSelectedClientState(null);
        setSelectedClientData(null);
        localStorage.removeItem(SELECTED_CLIENT_KEY);
      }
    } catch (error) {
      console.error('[Enterprise] Erreur chargement client:', error);
      setSelectedClientState(null);
      setSelectedClientData(null);
      localStorage.removeItem(SELECTED_CLIENT_KEY);
    } finally {
      setIsLoadingClient(false);
    }
  };

  // ============================================
  // LISTE CLIENTS
  // ============================================
  const loadClients = useCallback(async (params = {}) => {
    setIsLoadingClients(true);
    try {
      const result = await enterpriseService.getClients(params);
      if (result.success) {
        setClients(result.clients);
      }
      return result;
    } catch (error) {
      console.error('[Enterprise] Erreur chargement clients:', error);
      return { success: false, clients: [] };
    } finally {
      setIsLoadingClients(false);
    }
  }, []);

  // ============================================
  // CRUD CLIENTS
  // ============================================
  const createClient = useCallback(async (clientData) => {
    try {
      const result = await enterpriseService.createClient(clientData);
      if (result.success) {
        // Rafraîchir la liste
        await loadClients();
      }
      return result;
    } catch (error) {
      console.error('[Enterprise] Erreur création client:', error);
      return { success: false, error: error.response?.data?.error || 'Erreur serveur' };
    }
  }, [loadClients]);

  const updateClient = useCallback(async (clientId, data) => {
    try {
      const result = await enterpriseService.updateClient(clientId, data);
      if (result.success) {
        await loadClients();
        // Si c'est le client sélectionné, mettre à jour
        if (selectedClient?.id === clientId) {
          await loadClientDetail(clientId);
        }
      }
      return result;
    } catch (error) {
      console.error('[Enterprise] Erreur update client:', error);
      return { success: false, error: error.response?.data?.error || 'Erreur serveur' };
    }
  }, [loadClients, selectedClient]);

  // 🔑 Sauvegarder le snapshot financier du client sélectionné
  // C'est LA fonction appelée quand le conseiller modifie le budget/comptes d'un client
  const saveClientSnapshot = useCallback(async (userDataSnapshot) => {
    if (!selectedClient) {
      console.warn('[Enterprise] Tentative de save sans client sélectionné');
      return { success: false, error: 'Aucun client sélectionné' };
    }
    
    try {
      const result = await enterpriseService.saveClientSnapshot(selectedClient.id, userDataSnapshot);
      if (result.success) {
        setSelectedClientData(userDataSnapshot);
        console.log(`[Enterprise] Snapshot sauvegardé pour ${selectedClient.prenom} ${selectedClient.nom}`);
      }
      return result;
    } catch (error) {
      console.error('[Enterprise] Erreur save snapshot:', error);
      return { success: false, error: error.response?.data?.error || 'Erreur serveur' };
    }
  }, [selectedClient]);

  const archiveClient = useCallback(async (clientId) => {
    try {
      const result = await enterpriseService.archiveClient(clientId);
      if (result.success) {
        await loadClients();
        // Si c'est le client sélectionné, désélectionner
        if (selectedClient?.id === clientId) {
          selectClient(null);
        }
      }
      return result;
    } catch (error) {
      console.error('[Enterprise] Erreur archive client:', error);
      return { success: false, error: error.response?.data?.error || 'Erreur serveur' };
    }
  }, [loadClients, selectedClient, selectClient]);

  // ============================================
  // VALEUR DU CONTEXT
  // ============================================
  const value = {
    // État
    isEnterpriseMode,
    isLoading,
    organization,
    memberRole,
    isAdmin: memberRole === 'admin',
    
    // Client sélectionné
    selectedClient,
    selectedClientData,    // userDataSnapshot — c'est CE QUE UserDataContext doit utiliser
    isLoadingClient,
    selectClient,
    
    // Liste clients
    clients,
    isLoadingClients,
    loadClients,
    
    // CRUD
    createClient,
    updateClient,
    saveClientSnapshot,   // 🔑 La fonction clé pour sauvegarder les modifications
    archiveClient,
    
    // Helpers
    isViewingClient: !!selectedClient,  // true = on regarde un client, false = mode personnel
    refreshEnterprise: checkEnterprise,
  };

  return (
    <EnterpriseContext.Provider value={value}>
      {children}
    </EnterpriseContext.Provider>
  );
};

export default EnterpriseContext;
