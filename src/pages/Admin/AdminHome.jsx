// 🏠 AdminHome - Page d'accueil Administration PL4TO
// Hub central avec navigation vers les différentes sections admin

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import optimizationService from '../../services/optimization.service';

// Composant badge notification
const NotificationBadge = ({ count }) => {
  if (!count || count <= 0) return null;
  return (
    <div style={{
      position: 'absolute',
      top: '-8px',
      right: '-8px',
      background: '#e74c3c',
      color: 'white',
      borderRadius: '50%',
      width: count > 9 ? '28px' : '24px',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.75em',
      fontWeight: 'bold',
      border: '3px solid #0a0a2e',
      boxShadow: '0 2px 8px rgba(231, 76, 60, 0.5)',
      animation: 'pulse-badge 2s ease-in-out infinite',
      zIndex: 2
    }}>
      {count > 99 ? '99+' : count}
    </div>
  );
};

const AdminHome = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const adminToken = localStorage.getItem('pl4to_admin_token');
        if (!adminToken) {
          setIsLoading(false);
          return;
        }
        const adminStatus = await optimizationService.checkIsAdmin();
        setIsAdmin(adminStatus);
        if (adminStatus) {
          try {
            const statsData = await optimizationService.adminGetStats();
            const s = statsData?.stats || statsData || {};
            setPendingCount(s.pending || 0);
          } catch (e) { console.error('Stats error:', e); }
        }
      } catch (err) {
        console.error('Erreur vérification admin:', err);
      } finally {
        setIsLoading(false);
      }
    };
    checkAdmin();
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      
      const data = await response.json();
      
      if (data.success && data.token) {
        localStorage.setItem('pl4to_admin_token', data.token);
        const adminStatus = await optimizationService.checkIsAdmin();
        
        if (adminStatus) {
          setIsAdmin(true);
          try {
            const statsData = await optimizationService.adminGetStats();
            const s = statsData?.stats || statsData || {};
            setPendingCount(s.pending || 0);
          } catch (e) { /* ignore */ }
        } else {
          localStorage.removeItem('pl4to_admin_token');
          setLoginError('Ce compte n\'a pas les droits administrateur.');
        }
      } else {
        setLoginError(data.error || 'Identifiants incorrects');
      }
    } catch (err) {
      setLoginError('Erreur de connexion au serveur');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pl4to_admin_token');
    setIsAdmin(false);
    window.location.reload();
  };

  const sections = [
    {
      id: 'clients',
      title: 'Clients',
      icon: '👥',
      description: 'Gestion des utilisateurs B2C',
      color: '#3498db',
      gradient: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
      path: '/admin/clients',
      disabled: true
    },
    {
      id: 'entreprise',
      title: 'Entreprise',
      icon: '🏢',
      description: 'Portail entreprises B2B',
      color: '#9b59b6',
      gradient: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
      path: '/admin/entreprise',
      disabled: true
    },
    {
      id: 'administration',
      title: 'Administration',
      icon: '⚙️',
      description: 'Paramètres système',
      color: '#e67e22',
      gradient: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)',
      path: '/admin/settings',
      disabled: true
    },
    {
      id: 'optimisation',
      title: 'Gestion Optimisation',
      icon: '📊',
      description: 'Demandes d\'optimisation',
      color: '#27ae60',
      gradient: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
      path: '/admin/optimisation',
      disabled: false,
      badge: pendingCount
    },
    {
      id: 'facturation',
      title: 'Facturation',
      icon: '💳',
      description: 'Abonnements & paiements',
      color: '#e74c3c',
      gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
      path: '/admin/facturation',
      disabled: true
    }
  ];

  const leftSections = sections.filter(s => ['clients', 'entreprise', 'administration'].includes(s.id));
  const rightSections = sections.filter(s => ['optimisation', 'facturation'].includes(s.id));

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a2e 0%, #0d0d3f 50%, #0a0354 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3em', marginBottom: '15px' }}>⏳</div>
          <div>Chargement...</div>
        </div>
      </div>
    );
  }

  // Login form
  if (!isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a2e 0%, #0d0d3f 50%, #0a0354 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '24px',
          padding: '40px',
          maxWidth: '420px',
          width: '100%',
          border: '2px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>🔐</div>
            <h1 style={{ margin: 0, color: 'white', fontSize: '1.5em' }}>Administration PL4TO</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '8px 0 0' }}>Connexion requise</p>
          </div>

          {loginError && (
            <div style={{
              background: 'rgba(231, 76, 60, 0.2)',
              border: '1px solid rgba(231, 76, 60, 0.5)',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '20px',
              color: '#e74c3c',
              fontSize: '0.9em',
              textAlign: 'center'
            }}>
              {loginError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Email administrateur"
              style={{
                padding: '14px 18px',
                borderRadius: '12px',
                border: '2px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.08)',
                color: 'white',
                fontSize: '1em',
                outline: 'none'
              }}
            />
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Mot de passe"
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin(e)}
              style={{
                padding: '14px 18px',
                borderRadius: '12px',
                border: '2px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.08)',
                color: 'white',
                fontSize: '1em',
                outline: 'none'
              }}
            />
            <button
              onClick={handleAdminLogin}
              disabled={isLoggingIn || !loginEmail || !loginPassword}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: isLoggingIn
                  ? 'rgba(102, 126, 234, 0.5)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                fontSize: '1em',
                fontWeight: 'bold',
                marginTop: '5px'
              }}
            >
              {isLoggingIn ? '⏳ Connexion...' : '🔑 Se connecter'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard principal
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a2e 0%, #0d0d3f 50%, #0a0354 100%)',
      padding: '40px'
    }}>
      <style>{`
        @keyframes pulse-badge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '5px solid #f39c12', background: 'transparent' }} />
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '5px solid #667eea', background: 'transparent', marginLeft: '-15px' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, color: 'white', fontSize: '1.8em' }}>Administration PL4TO</h1>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.9em' }}>
              Panneau de gestion centralisé
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: '2px solid rgba(231, 76, 60, 0.5)',
            background: 'rgba(231, 76, 60, 0.15)',
            color: '#e74c3c',
            cursor: 'pointer',
            fontSize: '0.9em',
            fontWeight: 'bold'
          }}
        >
          🚪 Déconnexion
        </button>
      </div>

      {/* Grille de navigation */}
      <div style={{
        display: 'flex',
        gap: '30px',
        maxWidth: '900px',
        margin: '0 auto',
        minHeight: 'calc(100vh - 200px)',
        alignItems: 'center'
      }}>
        {/* Colonne gauche - 3 cartes */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {leftSections.map(section => (
            <div
              key={section.id}
              onClick={() => !section.disabled && navigate(section.path)}
              style={{
                background: section.disabled 
                  ? 'rgba(255,255,255,0.03)' 
                  : 'rgba(255,255,255,0.06)',
                borderRadius: '20px',
                padding: '30px',
                border: section.disabled 
                  ? '2px solid rgba(255,255,255,0.08)' 
                  : `2px solid ${section.color}40`,
                cursor: section.disabled ? 'default' : 'pointer',
                opacity: section.disabled ? 0.5 : 1,
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                if (!section.disabled) {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 12px 40px ${section.color}30`;
                  e.currentTarget.style.borderColor = `${section.color}80`;
                }
              }}
              onMouseLeave={(e) => {
                if (!section.disabled) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = `${section.color}40`;
                }
              }}
            >
              {section.disabled && (
                <span style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.7em',
                  color: 'rgba(255,255,255,0.4)'
                }}>
                  Bientôt
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  width: '55px',
                  height: '55px',
                  borderRadius: '15px',
                  background: section.disabled ? 'rgba(255,255,255,0.05)' : section.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6em',
                  boxShadow: section.disabled ? 'none' : `0 4px 15px ${section.color}40`
                }}>
                  {section.icon}
                </div>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    color: section.disabled ? 'rgba(255,255,255,0.4)' : 'white', 
                    fontSize: '1.2em' 
                  }}>
                    {section.title}
                  </h3>
                  <p style={{ 
                    margin: '4px 0 0', 
                    color: section.disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)', 
                    fontSize: '0.85em' 
                  }}>
                    {section.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Colonne droite - 2 cartes */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {rightSections.map(section => (
            <div
              key={section.id}
              onClick={() => !section.disabled && navigate(section.path)}
              style={{
                background: section.disabled 
                  ? 'rgba(255,255,255,0.03)' 
                  : 'rgba(255,255,255,0.06)',
                borderRadius: '20px',
                padding: '30px',
                border: section.disabled 
                  ? '2px solid rgba(255,255,255,0.08)' 
                  : `2px solid ${section.color}40`,
                cursor: section.disabled ? 'default' : 'pointer',
                opacity: section.disabled ? 0.5 : 1,
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'visible',
                flex: 1,
                display: 'flex',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => {
                if (!section.disabled) {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 12px 40px ${section.color}30`;
                  e.currentTarget.style.borderColor = `${section.color}80`;
                }
              }}
              onMouseLeave={(e) => {
                if (!section.disabled) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = `${section.color}40`;
                }
              }}
            >
              {section.disabled && (
                <span style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.7em',
                  color: 'rgba(255,255,255,0.4)'
                }}>
                  Bientôt
                </span>
              )}
              {section.badge > 0 && <NotificationBadge count={section.badge} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%' }}>
                <div style={{
                  width: '55px',
                  height: '55px',
                  borderRadius: '15px',
                  background: section.disabled ? 'rgba(255,255,255,0.05)' : section.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6em',
                  flexShrink: 0,
                  boxShadow: section.disabled ? 'none' : `0 4px 15px ${section.color}40`
                }}>
                  {section.icon}
                </div>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    color: section.disabled ? 'rgba(255,255,255,0.4)' : 'white', 
                    fontSize: '1.2em' 
                  }}>
                    {section.title}
                  </h3>
                  <p style={{ 
                    margin: '4px 0 0', 
                    color: section.disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)', 
                    fontSize: '0.85em' 
                  }}>
                    {section.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminHome;
