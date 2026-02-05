// 💎 UPGRADE PROMPT - Composant pour encourager l'upgrade vers un plan supérieur
// Utilisé quand une limite est atteinte ou une feature n'est pas disponible
// V2: Amélioré avec comparaison détaillée, prix annuel, essai gratuit

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSubscription, PLANS } from '../../context/SubscriptionContext';

// ============================================
// COMPOSANT MODAL UPGRADE - VERSION AMÉLIORÉE
// ============================================
export const UpgradeModal = ({ 
  isOpen, 
  onClose, 
  limitType,
  currentCount,
  maxCount,
  featureName
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { currentPlan } = useSubscription();
  const [showAnnual, setShowAnnual] = useState(false);

  if (!isOpen) return null;

  const isFr = i18n.language === 'fr';

  // Messages par type de limite
  const getContent = () => {
    const contents = {
      accounts: {
        icon: '💳',
        title: isFr ? 'Limite de comptes atteinte' : 'Account limit reached',
        description: isFr 
          ? 'Vous avez atteint la limite de votre portefeuille.'
          : 'You have reached your wallet limit.',
        benefit: isFr 
          ? 'Avec le plan Essentiel, ajoutez tous vos comptes!'
          : 'With the Essential plan, add all your accounts!'
      },
      destinations: {
        icon: '🧭',
        title: isFr ? 'Limite d\'objectifs atteinte' : 'Goals limit reached',
        description: isFr 
          ? 'Vous avez atteint votre limite d\'objectifs.'
          : 'You have reached your goals limit.',
        benefit: isFr 
          ? 'Avec le plan Essentiel, objectifs illimités!'
          : 'With the Essential plan, unlimited goals!'
      },
      budgetItems: {
        icon: '📋',
        title: isFr ? 'Limite de budget atteinte' : 'Budget limit reached',
        description: isFr 
          ? 'Vous avez atteint la limite de budget de votre plan.'
          : 'You have reached your plan\'s budget limit.',
        benefit: isFr 
          ? 'Avec le plan Essentiel, ajoutez tous vos budgets!'
          : 'With the Essential plan, add all your budgets!'
      },
      simulations: {
        icon: '🧮',
        title: isFr ? 'Limite de simulations atteinte' : 'Simulations limit reached',
        description: isFr 
          ? 'Vous avez atteint vos limites d\'utilisation gratuites de ce mois.'
          : 'You have reached your free usage limits for this month.',
        benefit: isFr 
          ? 'Avec le plan Essentiel, calculs illimités!'
          : 'With the Essential plan, unlimited calculations!'
      },
      gpsMonth: {
        icon: '📅',
        title: isFr ? 'Vue Mois non disponible' : 'Month view not available',
        description: isFr 
          ? 'Cette vue du GPS Financier est réservée aux membres Essentiel.'
          : 'This Financial GPS view is reserved for Essential members.',
        benefit: isFr 
          ? 'Visualisez votre parcours mois par mois!'
          : 'View your journey month by month!'
      },
      gpsYear: {
        icon: '📆',
        title: isFr ? 'Vue Année non disponible' : 'Year view not available',
        description: isFr 
          ? 'Cette vue du GPS Financier est réservée aux membres Essentiel.'
          : 'This Financial GPS view is reserved for Essential members.',
        benefit: isFr 
          ? 'Planifiez sur 54 ans!'
          : 'Plan for 54 years!'
      },
      calculatorPeriod: {
        icon: '🧮',
        title: isFr ? 'Période non disponible' : 'Period not available',
        description: isFr 
          ? 'Cette période de calcul est réservée aux membres Essentiel.'
          : 'This calculation period is reserved for Essential members.',
        benefit: isFr 
          ? 'Analysez sur toutes les périodes!'
          : 'Analyze over all periods!'
      },
      timeline: {
        icon: '⏳',
        title: isFr ? 'Timeline interactive' : 'Interactive timeline',
        description: isFr 
          ? 'Cette fonctionnalité est réservée aux membres Essentiel.'
          : 'This feature is reserved for Essential members.',
        benefit: isFr 
          ? 'Naviguez facilement dans le temps!'
          : 'Navigate easily through time!'
      },
      export: {
        icon: '📤',
        title: isFr ? 'Export de données' : 'Data export',
        description: isFr 
          ? 'L\'export de vos données est réservé aux membres Essentiel.'
          : 'Data export is reserved for Essential members.',
        benefit: isFr 
          ? 'Exportez vos données à tout moment!'
          : 'Export your data anytime!'
      }
    };

    return contents[limitType] || contents[featureName] || {
      icon: '💳',
      title: isFr ? 'Limite de comptes atteinte' : 'Account limit reached',
      description: isFr 
        ? 'Vous avez atteint la limite de votre portefeuille.'
        : 'You have reached your wallet limit.',
      benefit: isFr 
        ? 'Avec le plan Essentiel, ajoutez tous vos comptes!'
        : 'With the Essential plan, add all your accounts!'
    };
  };

  const content = getContent();

  const handleUpgrade = () => {
    onClose();
    navigate('/parametres', { state: { section: 'abonnement' } });
  };

  // Données de comparaison
  const comparisonData = [
    { 
      feature: isFr ? 'Vue quotidienne' : 'Daily View', 
      discovery: true, 
      essential: true 
    },
    { 
      feature: isFr ? 'Vue mensuelle' : 'Monthly View', 
      discovery: false, 
      essential: true 
    },
    { 
      feature: isFr ? 'Vue annuelle' : 'Yearly View', 
      discovery: false, 
      essential: true 
    },
    { 
      feature: isFr ? 'Comptes' : 'Accounts', 
      discovery: '3', 
      essential: isFr ? 'Illimité' : 'Unlimited' 
    },
    { 
      feature: isFr ? 'Objectifs' : 'Goals', 
      discovery: '2', 
      essential: isFr ? 'Illimité' : 'Unlimited' 
    },
    { 
      feature: isFr ? 'Calculatrice' : 'Calculator', 
      discovery: '5', 
      essential: isFr ? 'Illimité' : 'Unlimited' 
    },
  ];

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '20px',
          maxWidth: '480px',
          width: '100%',
          maxHeight: '95vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        {/* Header avec gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px 24px',
          textAlign: 'center',
          color: 'white',
          position: 'relative'
        }}>
          {/* Bouton fermer */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1.2em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
          
          <span style={{ fontSize: '2.5em' }}>{content.icon}</span>
          <h2 style={{ 
            margin: '12px 0 0', 
            fontSize: '1.3em',
            fontWeight: '600'
          }}>
            {content.title}
          </h2>
          <p style={{ 
            margin: '8px 0 0', 
            fontSize: '0.9em',
            opacity: 0.9
          }}>
            {content.description}
          </p>
        </div>

        {/* Contenu */}
        <div style={{ padding: '16px 20px' }}>
          
          {/* Social Proof */}
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '14px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#92400e', fontWeight: '600', fontSize: '0.9em' }}>
              🇨🇦 {isFr 
                ? 'Rejoignez d\'autres membres qui planifient leur avenir!' 
                : 'Join other members planning their future!'}
            </p>
          </div>

          {/* Mini-comparaison tableau */}
          <div style={{
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '14px'
          }}>
            {/* Header tableau */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr',
              background: '#f8fafc',
              borderBottom: '2px solid #e2e8f0'
            }}>
              <div style={{ padding: '8px 12px', fontWeight: '600', color: '#64748b', fontSize: '0.8em' }}>
                {isFr ? 'Fonctionnalité' : 'Feature'}
              </div>
              <div style={{ padding: '8px 6px', fontWeight: '600', color: '#64748b', fontSize: '0.8em', textAlign: 'center' }}>
                {isFr ? 'Découverte' : 'Discovery'}
              </div>
              <div style={{ 
                padding: '8px 6px', 
                fontWeight: '700', 
                color: '#667eea', 
                fontSize: '0.8em', 
                textAlign: 'center',
                background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)'
              }}>
                Essentiel
              </div>
            </div>
            
            {/* Lignes tableau */}
            {comparisonData.map((row, index) => (
              <div 
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  borderBottom: index < comparisonData.length - 1 ? '1px solid #e2e8f0' : 'none'
                }}
              >
                <div style={{ padding: '6px 12px', fontSize: '0.8em', color: '#1e293b' }}>
                  {row.feature}
                </div>
                <div style={{ padding: '6px', textAlign: 'center', fontSize: '0.85em' }}>
                  {typeof row.discovery === 'boolean' 
                    ? (row.discovery ? '✅' : '❌')
                    : <span style={{ color: '#64748b' }}>{row.discovery}</span>
                  }
                </div>
                <div style={{ 
                  padding: '6px', 
                  textAlign: 'center', 
                  fontSize: '0.85em',
                  background: 'linear-gradient(135deg, #667eea08 0%, #764ba208 100%)'
                }}>
                  {typeof row.essential === 'boolean' 
                    ? (row.essential ? '✅' : '❌')
                    : <span style={{ color: '#16a34a', fontWeight: '600' }}>{row.essential}</span>
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Toggle Mensuel/Annuel */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <button
              onClick={() => setShowAnnual(false)}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: 'none',
                background: !showAnnual ? '#667eea' : '#e2e8f0',
                color: !showAnnual ? 'white' : '#64748b',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.85em',
                transition: 'all 0.2s'
              }}
            >
              {isFr ? 'Mensuel' : 'Monthly'}
            </button>
            <button
              onClick={() => setShowAnnual(true)}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: 'none',
                background: showAnnual ? '#667eea' : '#e2e8f0',
                color: showAnnual ? 'white' : '#64748b',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.85em',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isFr ? 'Annuel' : 'Annual'}
              <span style={{
                background: showAnnual ? 'rgba(255,255,255,0.3)' : '#22c55e',
                color: showAnnual ? 'white' : 'white',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.75em'
              }}>
                -33%
              </span>
            </button>
          </div>

          {/* Prix - Offre Beta */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
            border: '2px solid #667eea',
            borderRadius: '12px',
            padding: '14px',
            textAlign: 'center',
            marginBottom: '14px'
          }}>
            {showAnnual ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <span style={{ 
                    fontSize: '1.1em', 
                    color: '#94a3b8', 
                    textDecoration: 'line-through' 
                  }}>
                    119,88$/an
                  </span>
                  <span style={{ 
                    fontSize: '2em', 
                    fontWeight: '700', 
                    color: '#667eea' 
                  }}>
                    71,88$/an
                  </span>
                </div>
                <p style={{ margin: '8px 0 0', color: '#16a34a', fontWeight: '600', fontSize: '0.9em' }}>
                  💰 {isFr ? 'Économisez 48$/an!' : 'Save $48/year!'}
                </p>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '1.2em', 
                    color: '#94a3b8', 
                    textDecoration: 'line-through' 
                  }}>
                    9,99$
                  </span>
                  <span style={{ 
                    fontSize: '2.2em', 
                    fontWeight: '700', 
                    color: '#667eea' 
                  }}>
                    5,99$
                  </span>
                  <span style={{ color: '#64748b', fontSize: '1em' }}>/mois</span>
                </div>
                <p style={{ margin: '8px 0 0', color: '#16a34a', fontWeight: '600', fontSize: '0.85em' }}>
                  🎉 {isFr ? 'Offre premiers utilisateurs!' : 'Early adopter offer!'}
                </p>
              </>
            )}
          </div>

          {/* Boutons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '2px solid #e2e8f0',
                background: 'white',
                color: '#64748b',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {isFr ? 'Plus tard' : 'Later'}
            </button>
            <button
              onClick={handleUpgrade}
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              🚀 {isFr ? 'Passer à Essentiel' : 'Upgrade to Essential'}
            </button>
          </div>

          {/* Garanties */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            marginTop: '12px',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.9em', color: '#64748b', fontWeight: '600' }}>
              ✓ {isFr ? 'Annulation en 1 clic' : 'Cancel in 1 click'}
            </span>
            <span style={{ fontSize: '0.9em', color: '#64748b', fontWeight: '600' }}>
              ✓ {isFr ? 'Sans engagement' : 'No commitment'}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ============================================
// COMPOSANT BANNER UPGRADE (inline)
// ============================================
export const UpgradeBanner = ({ 
  limitType, 
  currentCount, 
  maxCount,
  compact = false,
  onUpgradeClick
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isFr = i18n.language === 'fr';

  const handleClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      navigate('/parametres', { state: { section: 'abonnement' } });
    }
  };

  const getMessage = () => {
    switch (limitType) {
      case 'accounts':
        return `${currentCount}/${maxCount} ${isFr ? 'comptes utilisés' : 'accounts used'}`;
      case 'destinations':
        return `${currentCount}/${maxCount} ${isFr ? 'destinations utilisées' : 'destinations used'}`;
      case 'budgetItems':
        return `${currentCount}/${maxCount} ${isFr ? 'items budget utilisés' : 'budget items used'}`;
      case 'simulations':
        return `${currentCount}/${maxCount} ${isFr ? 'simulations ce mois' : 'simulations this month'}`;
      default:
        return isFr ? 'Limite atteinte' : 'Limit reached';
    }
  };

  if (compact) {
    return (
      <div 
        onClick={handleClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '20px',
          cursor: 'pointer',
          fontSize: '0.8em',
          color: '#92400e',
          fontWeight: '500'
        }}
      >
        <span>⚠️</span>
        <span>{getMessage()}</span>
        <span style={{ color: '#667eea' }}>→ Upgrade</span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      border: '2px solid #f59e0b',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '1.5em' }}>⚠️</span>
        <div>
          <p style={{ margin: 0, fontWeight: '600', color: '#92400e' }}>
            {getMessage()}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.85em', color: '#b45309' }}>
            {isFr ? 'Passez à Essentiel pour débloquer plus' : 'Upgrade to Essential to unlock more'}
          </p>
        </div>
      </div>
      <button
        onClick={handleClick}
        style={{
          padding: '10px 20px',
          borderRadius: '10px',
          border: 'none',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: '600',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          fontSize: '0.9em'
        }}
      >
        🚀 Upgrade
      </button>
    </div>
  );
};

// ============================================
// COMPOSANT BADGE LIMITE
// ============================================
export const LimitBadge = ({ current, max, type = 'default' }) => {
  const isNearLimit = max !== Infinity && current >= max * 0.8;
  const isAtLimit = max !== Infinity && current >= max;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '0.75em',
      fontWeight: '600',
      background: isAtLimit 
        ? '#fee2e2' 
        : isNearLimit 
          ? '#fef3c7' 
          : '#f0fdf4',
      color: isAtLimit 
        ? '#dc2626' 
        : isNearLimit 
          ? '#d97706' 
          : '#16a34a'
    }}>
      {isAtLimit ? '🔒' : isNearLimit ? '⚠️' : '✓'}
      {current}/{max === Infinity ? '∞' : max}
    </span>
  );
};

// ============================================
// COMPOSANT FEATURE LOCKED OVERLAY
// ============================================
export const FeatureLockedOverlay = ({ 
  featureName, 
  children,
  showOverlay = true 
}) => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const isFr = i18n.language === 'fr';

  const handleUnlock = () => {
    navigate('/parametres', { state: { section: 'abonnement' } });
  };

  if (!showOverlay) {
    return children;
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Contenu flouté */}
      <div style={{ 
        filter: 'blur(3px)', 
        opacity: 0.5,
        pointerEvents: 'none'
      }}>
        {children}
      </div>

      {/* Overlay */}
      <div 
        onClick={() => setShowModal(true)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.8)',
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <span style={{ fontSize: '3em', marginBottom: '12px' }}>🔒</span>
        <p style={{ 
          margin: 0, 
          fontWeight: '600', 
          color: '#1e293b',
          fontSize: '1.1em'
        }}>
          {isFr ? 'Fonctionnalité Premium' : 'Premium Feature'}
        </p>
        <p style={{ 
          margin: '8px 0 16px', 
          color: '#64748b',
          fontSize: '0.9em'
        }}>
          {isFr ? 'Disponible avec le plan Essentiel' : 'Available with Essential plan'}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleUnlock();
          }}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🚀 {isFr ? 'Débloquer' : 'Unlock'}
        </button>
      </div>

      {/* Modal optionnel */}
      {showModal && (
        <UpgradeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          featureName={featureName}
        />
      )}
    </div>
  );
};

// Export par défaut du modal
export default UpgradeModal;
