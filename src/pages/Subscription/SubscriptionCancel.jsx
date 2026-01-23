// ❌ PAGE ANNULATION PAIEMENT STRIPE
// PL4TO - GPS Financier

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SubscriptionCancel = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* Icône */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 30px'
        }}>
          <span style={{ fontSize: '3em' }}>🛒</span>
        </div>

        <h1 style={{ 
          color: 'white', 
          fontSize: '1.8em', 
          marginBottom: '16px',
          fontWeight: 'bold'
        }}>
          Paiement annulé
        </h1>

        <p style={{ 
          color: 'rgba(255,255,255,0.7)', 
          fontSize: '1.05em',
          lineHeight: '1.6',
          marginBottom: '30px'
        }}>
          Pas de soucis! Vous pouvez continuer à utiliser PL4TO gratuitement 
          ou réessayer plus tard.
        </p>

        <div style={{
          padding: '20px',
          background: 'rgba(102, 126, 234, 0.15)',
          borderRadius: '16px',
          marginBottom: '30px'
        }}>
          <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>
            💡 Rappel des avantages Essentiel:
          </p>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.95em' }}>
            GPS Financier complet • Projections multi-années • Illimité
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/parametres')}
            style={{
              padding: '14px 32px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: '600',
              fontSize: '1em',
              cursor: 'pointer'
            }}
          >
            🔄 Réessayer
          </button>
          
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '14px 32px',
              borderRadius: '12px',
              border: '2px solid rgba(255,255,255,0.3)',
              background: 'transparent',
              color: 'white',
              fontWeight: '600',
              fontSize: '1em',
              cursor: 'pointer'
            }}
          >
            Continuer gratuitement
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCancel;
