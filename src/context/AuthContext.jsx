import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import authService from '../services/auth.service';
import { storage } from '../utils/index.js';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // 🔐 État 2FA
  const [requires2FA, setRequires2FA] = useState(false);
  const [pending2FAEmail, setPending2FAEmail] = useState(null);

  useEffect(() => {
    const initAuth = () => {
      const token = storage.getAuthToken();
      const userData = storage.getUserData();
      
      if (token && userData) {
        setUser(userData);
        setIsAuthenticated(true);
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('🌐 AuthContext: Appel authService.login');
      const data = await authService.login(email, password);
      console.log('📥 AuthContext: Données reçues:', data);
      
      // 🔐 Vérifier si 2FA est requis
      if (data.requires2FA) {
        console.log('🔐 AuthContext: 2FA requis pour', email);
        setRequires2FA(true);
        setPending2FAEmail(email);
        return { success: false, requires2FA: true, email };
      }
      
      setUser(data.user);
      setIsAuthenticated(true);
      setLoading(false);
      
      console.log('✅ AuthContext: isAuthenticated = true');
      
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Erreur login:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erreur de connexion' 
      };
    }
  };

  // 🔐 Valider le code 2FA
  const validate2FA = async (code, isBackupCode = false) => {
    try {
      if (!pending2FAEmail) {
        return { success: false, error: 'Session expirée, veuillez vous reconnecter' };
      }
      
      console.log('🔐 AuthContext: Validation 2FA pour', pending2FAEmail);
      const data = await authService.validate2FA(pending2FAEmail, code, isBackupCode);
      
      setUser(data.user);
      setIsAuthenticated(true);
      setRequires2FA(false);
      setPending2FAEmail(null);
      setLoading(false);
      
      console.log('✅ AuthContext: 2FA validé, isAuthenticated = true');
      
      return { 
        success: true,
        backupCodeUsed: data.backupCodeUsed,
        backupCodesRemaining: data.backupCodesRemaining
      };
    } catch (error) {
      console.error('❌ AuthContext: Erreur validation 2FA:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Code invalide' 
      };
    }
  };

  // 🔐 Annuler le flow 2FA
  const cancel2FA = () => {
    setRequires2FA(false);
    setPending2FAEmail(null);
  };

  const register = async (userData) => {
    try {
      const data = await authService.register(userData);
      setUser(data.user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erreur d\'inscription' 
      };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setRequires2FA(false);
    setPending2FAEmail(null);
  };

  const updateProfile = async (userData) => {
    try {
      const updatedUser = await authService.updateProfile(userData);
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erreur de mise à jour' 
      };
    }
  };

  // 🔐 Login avec Google
  const loginWithGoogle = async (credential) => {
    try {
      console.log('🔐 AuthContext: Login Google');
      const data = await authService.loginWithGoogle(credential);
      
      setUser(data.user);
      setIsAuthenticated(true);
      setLoading(false);
      
      console.log('✅ AuthContext: Google login réussi, isNewUser:', data.isNewUser);
      
      return { 
        success: true, 
        isNewUser: data.isNewUser,
        user: data.user 
      };
    } catch (error) {
      console.error('❌ AuthContext: Erreur Google login:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erreur de connexion Google' 
      };
    }
  };

  // 📧 Vérifier le code email
  const verifyEmail = async (email, code) => {
    try {
      console.log('📧 AuthContext: Vérification email', email);
      const data = await authService.verifyEmail(email, code);
      
      if (data.token) {
        setUser(data.user);
        setIsAuthenticated(true);
      }
      
      console.log('✅ AuthContext: Email vérifié');
      
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Erreur vérification email:', error);
      const errorData = error.response?.data;
      return { 
        success: false, 
        error: errorData?.message || 'Code invalide',
        codeExpired: errorData?.codeExpired || false
      };
    }
  };

  // 🔄 Renvoyer le code de vérification
  const resendCode = async (email) => {
    try {
      console.log('🔄 AuthContext: Renvoi code à', email);
      await authService.resendCode(email);
      
      console.log('✅ AuthContext: Code renvoyé');
      
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Erreur renvoi code:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erreur d\'envoi du code' 
      };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    requires2FA,
    pending2FAEmail,
    login,
    loginWithGoogle,
    validate2FA,
    cancel2FA,
    register,
    logout,
    updateProfile,
    verifyEmail,
    resendCode,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;
