// 🔐 ADMIN DASHBOARD - Espace de gestion PL4TO
// Workflow: Réception → Analyse → Proposition → Acceptation
// Accès: Admin uniquement

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import optimizationService from '../../services/optimization.service';

const AdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  // États
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState(null);
  
  // États pour le modal d'analyse
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [freshData, setFreshData] = useState(null);
  const [proposalMessage, setProposalMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // États pour le login admin
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // État pour le modal de confirmation de suppression
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, requestId: null });
  
  // État pour le modal de confirmation d'annulation de proposition
  const [cancelProposalConfirm, setCancelProposalConfirm] = useState({ show: false, requestId: null });

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const adminStatus = await optimizationService.checkIsAdmin();
        setIsAdmin(adminStatus);
        
        if (!adminStatus) {
          setError('Accès réservé aux administrateurs');
          setIsLoading(false);
          return;
        }
        
        // Charger les données
        await loadData();
      } catch (err) {
        console.error('Erreur vérification admin:', err);
        setError('Erreur de vérification des droits');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdmin();
  }, []);

  // Charger les demandes et stats
  const loadData = useCallback(async () => {
    try {
      const [requestsData, statsData] = await Promise.all([
        optimizationService.adminGetAllRequests({ 
          status: filterStatus === 'all' ? undefined : filterStatus,
          sortBy: 'createdAt',
          sortOrder: 'asc'
        }),
        optimizationService.adminGetStats()
      ]);
      
      setRequests(requestsData.requests || []);
      setStats(statsData);
    } catch (err) {
      console.error('Erreur chargement données:', err);
      setError('Erreur lors du chargement des données');
    }
  }, [filterStatus]);

  // Recharger quand le filtre change
  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [filterStatus, isAdmin, loadData]);

  // Fonction de connexion admin (token séparé, ne touche PAS au token utilisateur)
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    
    try {
      // 🔐 Login direct sans passer par authService (token admin séparé)
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { error: data.error || 'Courriel ou mot de passe incorrect' };
      }
      
      // 🔓 Stocker le token admin SÉPARÉMENT
      localStorage.setItem('pl4to_admin_token', data.token);
      
      // Vérifier si l'utilisateur est admin
      const adminStatus = await optimizationService.checkIsAdmin();
      
      if (adminStatus) {
        setIsAdmin(true);
        await loadData();
      } else {
        setLoginError('Ce compte n\'a pas les droits administrateur.');
        localStorage.removeItem('pl4to_admin_token');
      }
    } catch (err) {
      console.error('Erreur connexion admin:', err);
      setLoginError(err.error || 'Courriel ou mot de passe incorrect');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Ouvrir une demande pour analyse
  const openRequest = async (request) => {
    navigate(`/admin/analysis/${request.requestId}`);
  };

  // Commencer l'analyse
  const startAnalysis = async () => {
    if (!selectedRequest) return;
    try {
      await optimizationService.adminStartAnalysis(selectedRequest.requestId);
      await loadData();
      setSelectedRequest(prev => ({ ...prev, status: 'analyzing' }));
    } catch (err) {
      console.error('Erreur début analyse:', err);
      alert('Erreur lors du démarrage de l\'analyse');
    }
  };

  // Rafraîchir le snapshot
  const refreshSnapshot = async () => {
    if (!selectedRequest) return;
    try {
      const result = await optimizationService.adminRefreshSnapshot(selectedRequest.requestId);
      setAnalysisData(result.newSnapshot);
      setFreshData(prev => ({ ...prev, hasChanges: false }));
      alert('Données mises à jour avec succès!');
    } catch (err) {
      console.error('Erreur refresh snapshot:', err);
      alert('Erreur lors de la mise à jour du snapshot');
    }
  };

  // Envoyer la proposition
  const sendProposal = async () => {
    if (!selectedRequest || !proposalMessage.trim()) {
      alert('Veuillez entrer un message pour la proposition');
      return;
    }
    setIsSending(true);
    try {
      const proposalData = {
        proposalMessage: proposalMessage,
        proposedChanges: analysisData?.budgetPlanning || {},
        projectedImpact: {
          message: 'Optimisation basée sur l\'analyse de votre trajectoire financière'
        }
      };
      await optimizationService.adminSendProposal(selectedRequest.requestId, proposalData);
      alert('Proposition envoyée avec succès!');
      setShowAnalysisModal(false);
      setSelectedRequest(null);
      setProposalMessage('');
      await loadData();
    } catch (err) {
      console.error('Erreur envoi proposition:', err);
      alert('Erreur lors de l\'envoi de la proposition');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteClick = (requestId, e) => {
    e.stopPropagation();
    setDeleteConfirm({ show: true, requestId });
  };

  const confirmDelete = async () => {
    const requestId = deleteConfirm.requestId;
    setDeleteConfirm({ show: false, requestId: null });
    try {
      await optimizationService.adminDeleteRequest(requestId);
      await loadData();
    } catch (err) {
      console.error('Erreur suppression:', err);
      alert('Erreur lors de la suppression de la demande');
    }
  };

  const handleCancelProposal = (requestId, e) => {
    e.stopPropagation();
    setCancelProposalConfirm({ show: true, requestId });
  };

  const confirmCancelProposal = async () => {
    const requestId = cancelProposalConfirm.requestId;
    setCancelProposalConfirm({ show: false, requestId: null });
    try {
      await optimizationService.adminDeleteRequest(requestId);
      await loadData();
    } catch (err) {
      console.error('Erreur annulation proposition:', err);
      alert('Erreur lors de l\'annulation de la proposition');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: { bg: '#fff3cd', text: '#856404', label: '⏳ En attente' },
      analyzing: { bg: '#cce5ff', text: '#004085', label: '🔍 En analyse' },
      proposal_ready: { bg: '#d4edda', text: '#155724', label: '✅ Proposition prête' },
      accepted: { bg: '#d1ecf1', text: '#0c5460', label: '🎉 Acceptée' },
      rejected: { bg: '#f8d7da', text: '#721c24', label: '❌ Refusée' },
      cancelled: { bg: '#e2e3e5', text: '#383d41', label: '🚫 Annulée' }
    };
    return colors[status] || { bg: '#e2e3e5', text: '#383d41', label: status };
  };

  const formatMontant = (montant) => {
    const num = new Intl.NumberFormat(i18n.language === 'en' ? 'en-CA' : 'fr-CA', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(montant || 0);
    return i18n.language === 'en' ? '$' + num : num + ' $';
  };

  // Loading
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3em', marginBottom: '20px' }}>⏳</div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  // Accès refusé - Page de connexion Admin
  if (!isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.1)', padding: '40px', borderRadius: '20px',
          textAlign: 'center', maxWidth: '400px', width: '90%'
        }}>
          {/* Logo Double O */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '5px solid #f39c12', background: 'transparent' }} />
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '5px solid #667eea', background: 'transparent', marginLeft: '-18px' }} />
          </div>
          
          <h1 style={{ margin: '0 0 10px', color: 'white' }}>Administration PL4TO</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '25px' }}>
            Connectez-vous pour accéder à l'espace admin
          </p>
          
          <form onSubmit={handleAdminLogin}>
            {loginError && (
              <div style={{
                background: 'rgba(231, 76, 60, 0.2)', border: '1px solid #e74c3c',
                borderRadius: '8px', padding: '10px', marginBottom: '15px',
                color: '#e74c3c', fontSize: '0.9em'
              }}>
                {loginError}
              </div>
            )}
            
            <div style={{ marginBottom: '15px' }}>
              <input
                type="email" placeholder="Courriel" value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)} required
                style={{
                  width: '100%', padding: '12px 15px', borderRadius: '10px',
                  border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)',
                  color: 'white', fontSize: '1em', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <input
                type="password" placeholder="Mot de passe" value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)} required
                style={{
                  width: '100%', padding: '12px 15px', borderRadius: '10px',
                  border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)',
                  color: 'white', fontSize: '1em', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
            
            <button type="submit" disabled={isLoggingIn} style={{
              width: '100%', padding: '12px 30px', borderRadius: '25px', border: 'none',
              background: isLoggingIn ? 'rgba(255,255,255,0.3)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white', fontWeight: 'bold',
              cursor: isLoggingIn ? 'not-allowed' : 'pointer', fontSize: '1em', marginBottom: '15px'
            }}>
              {isLoggingIn ? '⏳ Connexion...' : 'Se connecter'}
            </button>
          </form>
          
          <button onClick={() => navigate('/dashboard')} style={{
            padding: '10px 20px', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.3)',
            background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.9em'
          }}>
            ← Retour au Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
      color: 'white', padding: '30px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '15px', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '4px solid #f39c12', background: 'transparent' }} />
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '4px solid #667eea', background: 'transparent', marginLeft: '-12px' }} />
            </div>
            Administration PL4TO
          </h1>
          <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.7)' }}>
            Gestion des demandes d'optimisation
          </p>
        </div>
        <button
          onClick={() => {
            navigate('/admin');
          }}
          style={{
            padding: '10px 20px', borderRadius: '10px', border: '2px solid rgba(102, 126, 234, 0.5)',
            background: 'rgba(102, 126, 234, 0.15)', color: '#667eea', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'
          }}
        >
          ⬅ Retour
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' }}>
          <StatCard icon="📊" label="Total" value={stats.total} color="#667eea" />
          <StatCard icon="⏳" label="En attente" value={stats.pending} color="#f39c12" />
          <StatCard icon="🔍" label="En analyse" value={stats.analyzing} color="#3498db" />
          <StatCard icon="✅" label="Propositions" value={stats.proposalReady} color="#27ae60" />
          <StatCard icon="🎉" label="Acceptées" value={stats.accepted} color="#2ecc71" />
          <StatCard icon="📈" label="Taux acceptation" value={`${stats.acceptanceRate}%`} color="#9b59b6" />
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'pending', 'analyzing', 'proposal_ready', 'accepted', 'rejected'].map(status => (
          <button key={status} onClick={() => setFilterStatus(status)} style={{
            padding: '8px 16px', borderRadius: '20px', border: 'none',
            background: filterStatus === status ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.1)',
            color: 'white', cursor: 'pointer', fontWeight: filterStatus === status ? 'bold' : 'normal'
          }}>
            {status === 'all' ? '📋 Toutes' : getStatusColor(status).label}
          </button>
        ))}
        <button onClick={loadData} style={{
          padding: '8px 16px', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.3)',
          background: 'transparent', color: 'white', cursor: 'pointer', marginLeft: 'auto'
        }}>
          🔄 Rafraîchir
        </button>
      </div>

      {/* Liste des demandes */}
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '20px' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '1.2em', color: 'white' }}>
          📥 Demandes ({requests.length})
        </h2>
        
        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>📭</div>
            <p>Aucune demande pour le moment</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[...requests].reverse().map((request, index) => {
              const statusInfo = getStatusColor(request.status);
              return (
                <div key={request.id} onClick={() => openRequest(request)} style={{
                  display: 'grid', gridTemplateColumns: '1fr 150px 200px 120px', gap: '15px',
                  alignItems: 'center', padding: '15px 20px', background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#667eea'; e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                >
                  <div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#667eea' }}>{request.requestId}</span>
                    <span style={{ marginLeft: '10px', fontSize: '0.8em', color: 'rgba(255,255,255,0.5)' }}>#{requests.length - index}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '5px 12px', borderRadius: '15px', background: statusInfo.bg,
                      color: statusInfo.text, fontSize: '0.85em', fontWeight: '600', textAlign: 'center'
                    }}>{statusInfo.label}</span>
                    
                    {['pending', 'analyzing'].includes(request.status) && (
                      <button onClick={(e) => handleDeleteClick(request.requestId, e)} title="Supprimer" style={{
                        width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #e74c3c',
                        background: 'transparent', color: '#e74c3c', cursor: 'pointer', fontSize: '0.9em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#e74c3c'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#e74c3c'; }}
                      >×</button>
                    )}
                    
                    {request.status === 'proposal_ready' && (
                      <button onClick={(e) => handleCancelProposal(request.requestId, e)} title="Annuler l'envoi" style={{
                        padding: '4px 10px', borderRadius: '12px', border: '2px solid #f39c12',
                        background: 'transparent', color: '#f39c12', cursor: 'pointer',
                        fontSize: '0.75em', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f39c12'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f39c12'; }}
                      >↩ Annuler</button>
                    )}
                  </div>
                  
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9em' }}>📅 {formatDate(request.createdAt)}</span>
                  
                  <button style={{
                    padding: '8px 15px', borderRadius: '8px', border: 'none',
                    background: request.status === 'pending' ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' : 'rgba(255,255,255,0.1)',
                    color: 'white', cursor: 'pointer', fontSize: '0.85em'
                  }}>
                    {request.status === 'pending' ? '▶ Analyser' : '👁 Voir'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      {deleteConfirm.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setDeleteConfirm({ show: false, requestId: null })}>
          <div style={{
            background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '20px',
            padding: '30px', maxWidth: '400px', width: '90%', border: '2px solid #e74c3c',
            boxShadow: '0 20px 60px rgba(231, 76, 60, 0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(231, 76, 60, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '2em' }}>🗑️</div>
            </div>
            <h2 style={{ margin: '0 0 15px', textAlign: 'center', color: 'white', fontSize: '1.3em' }}>Supprimer la demande ?</h2>
            <p style={{ margin: '0 0 10px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.95em' }}>Vous êtes sur le point de supprimer:</p>
            <div style={{ background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.3)', borderRadius: '10px', padding: '12px', textAlign: 'center', marginBottom: '15px' }}>
              <code style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '1em' }}>{deleteConfirm.requestId}</code>
            </div>
            <p style={{ margin: '0 0 25px', textAlign: 'center', color: '#e74c3c', fontSize: '0.85em', fontWeight: '600' }}>⚠️ Cette action est irréversible</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setDeleteConfirm({ show: false, requestId: null })} style={{
                flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.3)',
                background: 'transparent', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '0.95em'
              }}>Annuler</button>
              <button onClick={confirmDelete} style={{
                flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', color: 'white',
                fontWeight: '600', cursor: 'pointer', fontSize: '0.95em', boxShadow: '0 4px 15px rgba(231, 76, 60, 0.4)'
              }}>🗑️ Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation d'annulation de proposition */}
      {cancelProposalConfirm.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setCancelProposalConfirm({ show: false, requestId: null })}>
          <div style={{
            background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '20px',
            padding: '30px', maxWidth: '400px', width: '90%', border: '2px solid #f39c12',
            boxShadow: '0 20px 60px rgba(243, 156, 18, 0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(243, 156, 18, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '2em' }}>↩️</div>
            </div>
            <h2 style={{ margin: '0 0 15px', textAlign: 'center', color: 'white', fontSize: '1.3em' }}>Annuler l'envoi ?</h2>
            <p style={{ margin: '0 0 10px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.95em' }}>La proposition sera retirée de l'écran de l'utilisateur:</p>
            <div style={{ background: 'rgba(243, 156, 18, 0.1)', border: '1px solid rgba(243, 156, 18, 0.3)', borderRadius: '10px', padding: '12px', textAlign: 'center', marginBottom: '15px' }}>
              <code style={{ color: '#f39c12', fontWeight: 'bold', fontSize: '1em' }}>{cancelProposalConfirm.requestId}</code>
            </div>
            <p style={{ margin: '0 0 25px', textAlign: 'center', color: '#f39c12', fontSize: '0.85em', fontWeight: '600' }}>⚠️ L'utilisateur ne verra plus cette proposition</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setCancelProposalConfirm({ show: false, requestId: null })} style={{
                flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.3)',
                background: 'transparent', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '0.95em'
              }}>Annuler</button>
              <button onClick={confirmCancelProposal} style={{
                flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)', color: 'white',
                fontWeight: '600', cursor: 'pointer', fontSize: '0.95em', boxShadow: '0 4px 15px rgba(243, 156, 18, 0.4)'
              }}>↩ Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Composant StatCard
const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    background: 'rgba(255,255,255,0.05)', borderRadius: '15px', padding: '20px',
    textAlign: 'center', borderLeft: `4px solid ${color}`
  }}>
    <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>{icon}</div>
    <div style={{ fontSize: '1.8em', fontWeight: 'bold', color }}>{value}</div>
    <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>{label}</div>
  </div>
);

export default AdminDashboard;
