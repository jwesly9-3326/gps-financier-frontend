// 🧭 PL4TO - PAGE VÉRIFICATION EMAIL
// Entrée du code à 6 chiffres
// 🌍 i18n enabled

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks';
import Toast from '../../components/common/Toast';

const VerifyEmail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, resendCode } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  // Récupérer l'email depuis la navigation
  const email = location.state?.email || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const inputRefs = useRef([]);

  // Rediriger si pas d'email
  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  // Countdown pour le bouton renvoyer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Focus sur le premier input au chargement
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    // Accepter seulement les chiffres
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Prendre seulement le dernier caractère
    setCode(newCode);
    setError(null);

    // Auto-focus sur le prochain input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Soumettre automatiquement si le code est complet
    if (newCode.every(digit => digit !== '') && index === 5) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Backspace - revenir en arrière
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (codeString = code.join('')) => {
    if (codeString.length !== 6) {
      setError(t('auth.verify.codeIncomplete', 'Entre le code complet'));
      return;
    }

    setLoading(true);
    setError(null);

    const result = await verifyEmail(email, codeString);
    setLoading(false);

    if (result.success) {
      showToast(t('auth.verify.success', 'Email vérifié! 🎉'), 'success');
      setTimeout(() => {
        navigate('/onboarding');
      }, 1500);
    } else {
      setError(result.error);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      
      if (result.codeExpired) {
        showToast(t('auth.verify.expired', 'Code expiré - demande un nouveau code'), 'error');
      }
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    setResending(true);
    const result = await resendCode(email);
    setResending(false);

    if (result.success) {
      showToast(t('auth.verify.codeSent', 'Nouveau code envoyé! 📧'), 'success');
      setCountdown(60); // 60 secondes avant de pouvoir renvoyer
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } else {
      showToast(result.error, 'error');
    }
  };

  // Composant O animé pour le logo
  const AnimatedO = ({ size = 55 }) => (
    <div style={{
      position: 'relative',
      width: `${size}px`,
      height: `${size}px`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: `${Math.max(3, size / 12)}px solid transparent`,
        background: 'linear-gradient(#040449, #100261) padding-box, linear-gradient(180deg, #ffd700, #ff8c00, #ff4500, #ffd700) border-box',
        animation: 'gps-ring-spin 3s linear infinite',
        boxShadow: '0 0 25px rgba(255, 165, 0, 0.5)'
      }} />
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #040449 0%, #100261 50%, #040449 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '450px' }}>
        {/* Logo PL4TO */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '6px',
            marginBottom: '15px'
          }}>
            <span style={{ 
              color: 'white', 
              fontSize: '2.8em', 
              fontWeight: 'bold',
              letterSpacing: '2px'
            }}>
              PL4T
            </span>
            <AnimatedO size={55} />
          </div>
        </div>

        {/* Card Vérification */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px 35px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          {/* Icône email */}
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 25px',
            fontSize: '36px'
          }}>
            📧
          </div>

          <h2 style={{ 
            color: '#2d3748', 
            fontSize: '1.5em', 
            marginBottom: '10px',
            fontWeight: 'bold'
          }}>
            {t('auth.verify.title', 'Vérifie ton email')}
          </h2>

          <p style={{ 
            color: '#718096', 
            fontSize: '0.95em', 
            marginBottom: '30px',
            lineHeight: '1.6'
          }}>
            {t('auth.verify.subtitle', 'Entre le code à 6 chiffres envoyé à')}
            <br />
            <strong style={{ color: '#667eea' }}>{email}</strong>
          </p>

          {/* Inputs du code */}
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '10px',
              marginBottom: '20px'
            }}
            onPaste={handlePaste}
          >
            {code.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                style={{
                  width: '50px',
                  height: '60px',
                  textAlign: 'center',
                  fontSize: '1.8em',
                  fontWeight: 'bold',
                  borderRadius: '12px',
                  border: error ? '2px solid #f56565' : '2px solid #e2e8f0',
                  outline: 'none',
                  transition: 'all 0.3s',
                  color: '#2d3748'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error ? '#f56565' : '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            ))}
          </div>

          {/* Message d'erreur */}
          {error && (
            <p style={{ 
              color: '#f56565', 
              fontSize: '0.9em', 
              marginBottom: '20px',
              animation: 'shake 0.5s ease-in-out'
            }}>
              🚫 {error}
            </p>
          )}

          {/* Bouton Vérifier */}
          <button
            onClick={() => handleSubmit()}
            disabled={loading || code.some(d => d === '')}
            style={{
              width: '100%',
              padding: '16px',
              background: loading || code.some(d => d === '')
                ? '#a0aec0' 
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.1em',
              fontWeight: 'bold',
              cursor: loading || code.some(d => d === '') ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              marginBottom: '20px'
            }}
          >
            {loading ? '🔄 Vérification...' : '✅ Vérifier'}
          </button>

          {/* Renvoyer le code */}
          <p style={{ color: '#718096', fontSize: '0.9em' }}>
            {t('auth.verify.noCode', "Tu n'as pas reçu le code?")}
            <br />
            <button
              onClick={handleResend}
              disabled={resending || countdown > 0}
              style={{
                background: 'none',
                border: 'none',
                color: countdown > 0 ? '#a0aec0' : '#667eea',
                fontWeight: '600',
                cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                marginTop: '8px',
                fontSize: '0.95em'
              }}
            >
              {resending 
                ? '🔄 Envoi...' 
                : countdown > 0 
                  ? `⏰ Renvoyer dans ${countdown}s` 
                  : '🔄 Renvoyer le code'}
            </button>
          </p>
        </div>

        {/* Retour */}
        <div style={{ textAlign: 'center', marginTop: '25px' }}>
          <Link 
            to="/register"
            style={{
              color: 'rgba(255,255,255,0.8)',
              textDecoration: 'none',
              fontSize: '0.95em'
            }}
          >
            ← {t('auth.verify.backToRegister', 'Modifier mon email')}
          </Link>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}

      {/* Animation CSS */}
      <style>{`
        @keyframes gps-ring-spin {
          0% {
            transform: rotate(0deg);
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.5);
          }
          50% {
            box-shadow: 0 0 35px rgba(255, 165, 0, 0.8), 0 0 50px rgba(255, 69, 0, 0.4);
          }
          100% {
            transform: rotate(360deg);
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.5);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
};

export default VerifyEmail;
