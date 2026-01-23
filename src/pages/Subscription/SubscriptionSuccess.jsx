// ✅ PAGE SUCCÈS PAIEMENT STRIPE
// PL4TO - GPS Financier

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Countdown et redirection
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '60px 40px',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%',
        border: '2px solid rgba(46, 204, 113, 0.3)',
        boxShadow: '0 20px 60px rgba(46, 204, 113, 0.2)'
      }}>
        {/* Icône de succès animée */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 30px',
          animation: 'pulse 2s infinite',
          boxShadow: '0 10px 40px rgba(46, 204, 113, 0.4)'
        }}>
          <span style={{ fontSize: '3em' }}>✓</span>
        </div>

        <h1 style={{ 
          color: '#2ecc71', 
          fontSize: '2em', 
          marginBottom: '16px',
          fontWeight: 'bold'
        }}>
          🎉 Paiement réussi!
        </h1>

        <p style={{ 
          color: 'rgba(255,255,255,0.8)', 
          fontSize: '1.1em',
          lineHeight: '1.6',
          marginBottom: '30px'
        }}>
          Bienvenue dans PL4TO <strong style={{ color: '#667eea' }}>Essentiel</strong>!
          <br />
          Votre abonnement est maintenant actif.
        </p>

        <div style={{
          padding: '20px',
          background: 'rgba(102, 126, 234, 0.15)',
          borderRadius: '16px',
          marginBottom: '30px'
        }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)' }}>
            ✨ Accès complet au GPS Financier
            <br />
            ✨ Projections sur plusieurs années
            <br />
            ✨ Comptes et destinations illimités
          </p>
        </div>

        <p style={{ 
          color: 'rgba(255,255,255,0.6)', 
          fontSize: '0.95em',
          marginBottom: '20px'
        }}>
          Redirection vers le tableau de bord dans <strong style={{ color: '#667eea' }}>{countdown}</strong> secondes...
        </p>

        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '14px 40px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: '600',
            fontSize: '1em',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          🚀 Aller au tableau de bord
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default SubscriptionSuccess;
