// 🏢 ENTERPRISE DASHBOARD - Page principale du conseiller
// Affiche: liste clients, KPIs, alertes, bouton créer client
// Le conseiller sélectionne un client → le GPS/Budget/Comptes montrent les données du client

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEnterprise } from '../../context/EnterpriseContext';
import enterpriseService from '../../services/enterprise.service';

// ============================================
// COMPOSANT: Modal création de client rapide
// ============================================
const CreateClientModal = ({ isOpen, onClose, onCreate }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.prenom.trim() || !formData.nom.trim()) {
      setError('Le prénom et le nom sont requis');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    const result = await onCreate(formData);
    
    if (result.success) {
      setFormData({ prenom: '', nom: '', email: '', phone: '', notes: '' });
      onClose();
    } else {
      setError(result.error || 'Erreur lors de la création');
    }
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-primary-main dark:text-white">
            ➕ Nouveau client
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                Prénom *
              </label>
              <input
                type="text"
                value={formData.prenom}
                onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Jean"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                Nom *
              </label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Tremblay"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Courriel
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="jean.tremblay@email.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="514-555-0123"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={3}
              placeholder="Notes sur le client, objectifs, situation particulière..."
            />
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '⏳ Création...' : '✅ Créer le client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
const EnterpriseDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { 
    isEnterpriseMode, 
    isLoading: isEnterpriseLoading, 
    organization, 
    memberRole,
    isAdmin,
    clients, 
    isLoadingClients, 
    loadClients,
    createClient,
    selectClient,
    selectedClient,
    archiveClient
  } = useEnterprise();

  const [dashboard, setDashboard] = useState(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Charger les données au montage
  useEffect(() => {
    if (isEnterpriseMode) {
      loadDashboard();
      loadClients();
    }
  }, [isEnterpriseMode]);

  const loadDashboard = async () => {
    setIsLoadingDashboard(true);
    try {
      const result = await enterpriseService.getDashboard();
      if (result.success) {
        setDashboard(result.dashboard);
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Sélectionner un client et naviguer vers le GPS
  const handleSelectClient = async (client) => {
    await selectClient(client);
    navigate('/gps');
  };

  // Filtrer les clients par recherche
  const filteredClients = clients.filter(client => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      client.prenom?.toLowerCase().includes(query) ||
      client.nom?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query)
    );
  });

  // ===== LOADING =====
  if (isEnterpriseLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-slate-500">Chargement...</p>
        </div>
      </div>
    );
  }

  // ===== PAS EN MODE ENTERPRISE =====
  if (!isEnterpriseMode) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏢</div>
          <h2 className="text-2xl font-bold text-primary-main dark:text-white mb-3">
            PL4TO Entreprise
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Votre compte n'est pas associé à une organisation. 
            Contactez PL4TO pour configurer votre accès entreprise.
          </p>
          <a 
            href="mailto:info@pl4to.com?subject=PL4TO Entreprise - Demande d'accès"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            📧 Contacter PL4TO
          </a>
        </div>
      </div>
    );
  }

  // ===== DASHBOARD ENTERPRISE =====
  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              {organization?.logoUrl ? (
                <img src={organization.logoUrl} alt={organization.name} className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {organization?.name?.charAt(0) || 'E'}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-primary-main dark:text-white">
                  {organization?.name || 'Mon Cabinet'}
                </h1>
                <p className="text-sm text-slate-500">
                  {memberRole === 'admin' ? '👑 Administrateur' : '🧑‍💼 Conseiller'} 
                  {selectedClient && (
                    <span className="ml-2 text-blue-600">
                      • Client actif: <strong>{selectedClient.prenom} {selectedClient.nom}</strong>
                      <button 
                        onClick={() => selectClient(null)} 
                        className="ml-1 text-red-400 hover:text-red-600"
                        title="Revenir à mon profil"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2 self-start"
          >
            ➕ Nouveau client
          </button>
        </div>

        {/* KPIs */}
        {dashboard && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Clients actifs', value: dashboard.totalClients, icon: '👥', color: 'blue' },
              { label: 'Cette semaine', value: `+${dashboard.recentClients}`, icon: '📈', color: 'emerald' },
              { label: 'Alertes', value: dashboard.clientsWithAlerts, icon: '⚠️', color: dashboard.clientsWithAlerts > 0 ? 'red' : 'slate' },
              { label: 'Archivés', value: dashboard.archivedClients, icon: '📦', color: 'slate' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{kpi.label}</span>
                  <span className="text-lg">{kpi.icon}</span>
                </div>
                <div className={`text-2xl font-bold text-${kpi.color}-600 dark:text-${kpi.color}-400`}>
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Org stats (admin only) */}
        {dashboard?.orgStats && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 flex items-center justify-between">
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <strong>{dashboard.orgStats.totalMembers}</strong> conseillers · <strong>{dashboard.orgStats.totalAllClients}</strong> clients au total
            </div>
            <div className="text-xs text-blue-500">
              {dashboard.orgStats.seatsUsed}/{dashboard.orgStats.seatsMax} sièges utilisés
            </div>
          </div>
        )}

        {/* Barre de recherche */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Rechercher un client par nom, prénom ou courriel..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>

        {/* Liste des clients */}
        <div className="space-y-2">
          {isLoadingClients ? (
            <div className="text-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-slate-500">Chargement des clients...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {searchQuery ? 'Aucun client trouvé' : 'Aucun client pour le moment'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  ➕ Créer votre premier client
                </button>
              )}
            </div>
          ) : (
            filteredClients.map((client) => (
              <div
                key={client.id}
                className={`bg-white dark:bg-slate-900 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                  selectedClient?.id === client.id 
                    ? 'border-blue-500 ring-2 ring-blue-500/20' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {client.prenom?.charAt(0)}{client.nom?.charAt(0)}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate">
                        {client.prenom} {client.nom}
                      </h3>
                      {selectedClient?.id === client.id && (
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium">
                          Actif
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      {client.email && <span>📧 {client.email}</span>}
                      {client.financialSummary && (
                        <>
                          <span>💰 {client.financialSummary.accountCount} comptes</span>
                          {client.financialSummary.totalBalance > 0 && (
                            <span className="text-emerald-600">
                              ${client.financialSummary.totalBalance.toLocaleString('fr-CA', { minimumFractionDigits: 0 })}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSelectClient(client); }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                      🧭 GPS
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSelectClient(client); navigate('/budget'); }}
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                    >
                      📊 Budget
                    </button>
                  </div>
                </div>
                
                {/* Date de dernière modification */}
                <div className="px-4 pb-3 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Modifié {new Date(client.updatedAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {client.lastProjectionAt && (
                    <span>
                      GPS consulté {new Date(client.lastProjectionAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Modal création client */}
      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createClient}
      />
    </div>
  );
};

export default EnterpriseDashboard;
