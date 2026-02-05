// 🗺️ WELCOME AMÉLIORÉ - Message de propriété
// Met l'emphase sur: plateforme, ton outil, confidentialité

import { useTranslation } from 'react-i18next';
import { useOnboarding } from '../../context/OnboardingContext';

const WelcomeImproved = () => {
  const { goNext } = useOnboarding();
  const { t } = useTranslation();

  const AnimatedO = ({ size = 120 }) => (
    <div style={{
      position: 'relative',
      width: `${size}px`,
      height: `${size}px`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '30px'
    }}>
      <div style={{
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: `${Math.max(4, size / 20)}px solid transparent`,
        background: 'linear-gradient(#040449, #040449) padding-box, linear-gradient(180deg, #ffd700, #ff8c00, #ff4500, #ffd700) border-box',
        animation: 'gps-ring-spin 3s linear infinite',
        boxShadow: '0 0 40px rgba(255, 165, 0, 0.5), 0 0 80px rgba(255, 152, 0, 0.3)'
      }} />
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'linear-gradient(180deg, #040449 0%, #100261 50%, #040449 100%)'
    }}>
      <AnimatedO size={120} />

      {/* Titre avec emphase sur "TON" */}
      <h1 style={{
        fontSize: '2.5em',
        fontWeight: 'bold',
        color: 'white',
        marginBottom: '15px',
        textAlign: 'center',
        lineHeight: 1.3
      }}>
        Bienvenue sur<br/>
        <span style={{ color: '#ffd700' }}>TA</span> plateforme financière
      </h1>

      {/* Message central: C'est TON outil */}
      <p style={{
        fontSize: '1.2em',
        color: 'rgba(255,255,255,0.9)',
        marginBottom: '50px',
        textAlign: 'center',
        maxWidth: '500px',
        lineHeight: 1.6
      }}>
        PL4TO te donne les outils.<br/>
        <strong style={{ color: '#ffd700' }}>Tu crées ton GPS.</strong><br/>
        Tes données restent à toi. Toujours.
      </p>

      {/* 3 Principes clés */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginBottom: '50px',
        maxWidth: '500px'
      }}>
        {/* 1. Ton outil */}
        <div style={{
          background: 'rgba(255,215,0,0.1)',
          border: '2px solid rgba(255,215,0,0.3)',
          padding: '20px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2em', marginBottom: '10px' }}>🛠️</div>
          <h3 style={{ color: '#ffd700', marginBottom: '8px', fontSize: '1.1em' }}>
            C'est TON outil
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95em' }}>
            Tu le personnalises selon tes besoins.<br/>Pas de one-size-fits-all.
          </p>
        </div>

        {/* 2. Tes données */}
        <div style={{
          background: 'rgba(255,215,0,0.1)',
          border: '2px solid rgba(255,215,0,0.3)',
          padding: '20px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2em', marginBottom: '10px' }}>🔒</div>
          <h3 style={{ color: '#ffd700', marginBottom: '8px', fontSize: '1.1em' }}>
            TES données restent à toi
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95em' }}>
            Aucun numéro de compte requis.<br/>Contrôle total. Confidentialité maximale.
          </p>
        </div>

        {/* 3. Ta vision */}
        <div style={{
          background: 'rgba(255,215,0,0.1)',
          border: '2px solid rgba(255,215,0,0.3)',
          padding: '20px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2em', marginBottom: '10px' }}>🧭</div>
          <h3 style={{ color: '#ffd700', marginBottom: '8px', fontSize: '1.1em' }}>
            TON parcours, à ta façon
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95em' }}>
            Vois où tu vas sur 54 ans.<br/>Ajuste ta route. Atteins tes destinations.
          </p>
        </div>
      </div>

      {/* Bouton CTA */}
      <button
        onClick={goNext}
        style={{
          background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
          color: '#040449',
          padding: '18px 50px',
          fontSize: '1.2em',
          fontWeight: 'bold',
          borderRadius: '50px',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(255, 140, 0, 0.4)',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 15px 40px rgba(255, 140, 0, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 10px 30px rgba(255, 140, 0, 0.4)';
        }}
      >
        Créer mon GPS 🚀
      </button>

      {/* Mention temps estimé */}
      <p style={{
        marginTop: '30px',
        color: 'rgba(255,255,255,0.5)',
        fontSize: '0.9em'
      }}>
        ⏱️ Configuration: 5 minutes
      </p>
    </div>
  );
};

export default WelcomeImproved;
