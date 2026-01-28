// 🧭 PL4TO - Composant Installation PWA
// Affiche un bouton d'installation ou les instructions iOS

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import usePWA from '../../hooks/usePWA';

// Mini composant O doré (version statique pour la bannière)
const GoldenO = ({ size = 24 }) => (
  <div style={{
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    border: `${Math.max(2, size / 10)}px solid transparent`,
    background: 'linear-gradient(#1e1b4b, #1e1b4b) padding-box, linear-gradient(180deg, #ffd700, #ff8c00, #ff4500, #ffd700) border-box',
    boxShadow: '0 0 8px rgba(255, 165, 0, 0.6)',
    flexShrink: 0
  }} />
);

const InstallPWA = ({ variant = 'banner' }) => {
  const { t } = useTranslation();
  const { canInstall, isIOS, isInstalled, isStandalone, installApp } = usePWA();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Ne rien afficher si déjà installé ou fermé
  if (isInstalled || isStandalone || dismissed) {
    return null;
  }

  // Afficher les instructions iOS
  if (isIOS && !isStandalone) {
    if (variant === 'button') {
      return (
        <button
          onClick={() => setShowIOSInstructions(true)}
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '30px',
            fontSize: '0.95em',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📲 Installer l'app
        </button>
      );
    }

    return (
      <>
        {showIOSInstructions && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            padding: '20px',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
            zIndex: 1000,
            color: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1em' }}>📲 Installer PL4TO</h3>
              <button
                onClick={() => setShowIOSInstructions(false)}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5em', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: '0.95em', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 10px 0' }}>Pour installer PL4TO sur votre iPhone/iPad:</p>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Appuyez sur <strong>Partager</strong> <span style={{ opacity: 0.7 }}>⬆️</span></li>
                <li>Faites défiler et appuyez sur <strong>"Sur l'écran d'accueil"</strong></li>
                <li>Appuyez sur <strong>Ajouter</strong></li>
              </ol>
            </div>
          </div>
        )}
        
        {!showIOSInstructions && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            padding: '15px 20px',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <GoldenO size={32} />
              <div>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95em' }}>Installer PL4TO</p>
                <p style={{ margin: 0, fontSize: '0.8em', opacity: 0.8 }}>Accès rapide depuis l'écran d'accueil</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDismissed(true)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.85em',
                  cursor: 'pointer'
                }}
              >
                Plus tard
              </button>
              <button
                onClick={() => setShowIOSInstructions(true)}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                  border: 'none',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.85em',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Comment faire
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Afficher le bouton d'installation Android/Desktop
  if (canInstall) {
    if (variant === 'button') {
      return (
        <button
          onClick={installApp}
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '30px',
            fontSize: '0.95em',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📲 Installer l'app
        </button>
      );
    }

    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        right: '20px',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        padding: '15px 20px',
        borderRadius: '15px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <GoldenO size={32} />
          <div>
            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95em' }}>Installer PL4TO</p>
            <p style={{ margin: 0, fontSize: '0.8em', opacity: 0.8 }}>Accès rapide depuis l'écran d'accueil</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.85em',
              cursor: 'pointer'
            }}
          >
            Plus tard
          </button>
          <button
            onClick={installApp}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
              border: 'none',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.85em',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Installer
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default InstallPWA;
