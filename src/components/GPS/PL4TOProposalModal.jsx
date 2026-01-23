// 📨 Modal Proposition PL4TO - Affiche les propositions d'optimisation aux utilisateurs
// Utilisé quand status === 'proposal_ready'

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import optimizationService from '../../services/optimization.service';

const PL4TOProposalModal = ({ 
  isOpen, 
  onClose, 
  proposal,
  onAccepted,
  onRejected,
  formatMontant
}) => {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setShowSuccess(false);
      setShowRejected(false);
      setError(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen || !proposal) return null;

  const proposedChanges = proposal.proposedChanges || {};
  const projectedImpact = proposal.projectedImpact || {};
  const recommendations = proposedChanges.recommendations || [];

  // Calculer le pourcentage de réduction
  const totalCurrentPayments = proposedChanges.totalCurrentPaymentsMonthly || 0;
  const totalNewPayments = proposedChanges.totalNewPaymentsMonthly || 0;
  const reductionPercent = totalCurrentPayments > 0 
    ? Math.round(((totalCurrentPayments - totalNewPayments) / totalCurrentPayments) * 100)
    : 0;

  const monthlyRecovery = projectedImpact.monthlyRecovery || 0;
  const yearlyRecovery = projectedImpact.yearlyRecovery || monthlyRecovery * 12;

  // Formater la date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'bientôt';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-CA', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const firstInterventionDate = projectedImpact.firstInterventionDate 
    ? formatDate(projectedImpact.firstInterventionDate)
    : 'bientôt';

  const handleAccept = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      await optimizationService.respondToProposal(proposal.requestId, 'accepted');
      setShowSuccess(true);
      
      // Attendre un peu puis fermer et notifier le parent
      setTimeout(() => {
        if (onAccepted) onAccepted();
        onClose();
      }, 2500);
      
    } catch (err) {
      console.error('[PL4TOProposal] Erreur acceptation:', err);
      setError(err.error || 'Erreur lors de l\'acceptation');
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      await optimizationService.respondToProposal(proposal.requestId, 'rejected');
      setShowRejected(true);
      
      setTimeout(() => {
        if (onRejected) onRejected();
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('[PL4TOProposal] Erreur refus:', err);
      setError(err.error || 'Erreur lors du refus');
      setIsProcessing(false);
    }
  };

  // Modal de succès
  if (showSuccess) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          background: 'linear-gradient(180deg, #0a0354 0%, #100261 100%)',
          borderRadius: '24px',
          maxWidth: '450px',
          width: '90%',
          overflow: 'hidden',
          border: '3px solid rgba(39, 174, 96, 0.6)',
          boxShadow: '0 20px 60px rgba(39, 174, 96, 0.3)',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
            padding: '40px 30px'
          }}>
            <div style={{ fontSize: '4em', marginBottom: '15px' }}>✅</div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '1.5em' }}>
              Optimisation appliquée!
            </h2>
          </div>
          <div style={{ padding: '30px' }}>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1em', margin: '0 0 15px' }}>
              Vos paiements ont été ajustés avec succès.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95em', margin: 0 }}>
              Économie mensuelle: <strong style={{ color: '#27ae60' }}>+{formatMontant(monthlyRecovery)}</strong>
            </p>
            <div style={{ 
              marginTop: '20px', 
              display: 'flex', 
              justifyContent: 'center',
              gap: '8px'
            }}>
              {[0,1,2].map(i => (
                <div 
                  key={i}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#27ae60',
                    animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modal de refus
  if (showRejected) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          background: 'linear-gradient(180deg, #0a0354 0%, #100261 100%)',
          borderRadius: '24px',
          maxWidth: '400px',
          width: '90%',
          overflow: 'hidden',
          border: '2px solid rgba(149, 165, 166, 0.5)',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)',
            padding: '30px'
          }}>
            <div style={{ fontSize: '3em', marginBottom: '10px' }}>📋</div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '1.3em' }}>
              Proposition refusée
            </h2>
          </div>
          <div style={{ padding: '25px' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1em', margin: 0 }}>
              Votre réponse a été enregistrée.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Modal principal
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10001,
      padding: '20px',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: 'linear-gradient(180deg, #0a0354 0%, #100261 100%)',
        borderRadius: '24px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        border: '2px solid rgba(39, 174, 96, 0.5)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 25px',
          borderBottom: '2px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.2) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8em' }}>📨</span>
            <div>
              <h2 style={{ margin: 0, color: 'white', fontSize: '1.2em' }}>
                Proposition PL4TO
              </h2>
              <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.8em' }}>
                Une optimisation a été préparée pour vous
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: '2px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'white',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '1em',
              opacity: isProcessing ? 0.5 : 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Corps */}
        <div style={{
          padding: '25px',
          maxHeight: 'calc(90vh - 200px)',
          overflowY: 'auto'
        }}>
          {/* Message explicatif */}
          <div style={{
            background: 'rgba(52, 152, 219, 0.15)',
            borderRadius: '15px',
            padding: '20px',
            marginBottom: '25px',
            border: '2px solid rgba(52, 152, 219, 0.3)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.1em', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
              Vos paiements génèrent un <strong style={{ color: '#f39c12' }}>surplus</strong> sur vos comptes crédit.
            </div>
            <div style={{ fontSize: '1em', color: 'rgba(255,255,255,0.8)', marginTop: '10px' }}>
              En ajustant vos paiements à votre budget réel à partir de <strong style={{ color: '#3498db' }}>{firstInterventionDate}</strong>:
            </div>
          </div>

          {/* Gros pourcentage */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.25) 0%, rgba(46, 204, 113, 0.15) 100%)',
            borderRadius: '20px',
            padding: '35px 25px',
            marginBottom: '25px',
            border: '3px solid rgba(39, 174, 96, 0.5)',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '4em', 
              fontWeight: 'bold', 
              color: '#27ae60',
              marginBottom: '10px',
              textShadow: '0 2px 10px rgba(39, 174, 96, 0.3)'
            }}>
              -{reductionPercent}%
            </div>
            <div style={{ 
              fontSize: '1.3em', 
              color: 'white',
              fontWeight: '600'
            }}>
              📉 Réduisez vos paiements de {reductionPercent}%
            </div>
            <div style={{ 
              fontSize: '0.95em', 
              color: 'rgba(255,255,255,0.7)',
              marginTop: '15px'
            }}>
              {formatMontant(totalCurrentPayments)}/mois → {formatMontant(totalNewPayments)}/mois
            </div>
            <div style={{ 
              fontSize: '1.1em', 
              color: '#27ae60',
              marginTop: '10px',
              fontWeight: 'bold'
            }}>
              Économie: +{formatMontant(monthlyRecovery)}/mois
            </div>
          </div>

          {/* Impact cumulé */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <div style={{ 
              fontSize: '0.85em', 
              color: 'rgba(255,255,255,0.6)', 
              marginBottom: '10px',
              textAlign: 'center'
            }}>
              📈 Impact cumulé de l'économie
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              {[
                { label: '1 an', value: yearlyRecovery },
                { label: '5 ans', value: yearlyRecovery * 5 },
                { label: '10 ans', value: yearlyRecovery * 10 },
                { label: '15 ans', value: yearlyRecovery * 15 }
              ].map((period, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    background: idx === 3 ? 'rgba(39, 174, 96, 0.2)' : 'rgba(52, 152, 219, 0.1)',
                    borderRadius: '8px',
                    padding: '10px 5px',
                    textAlign: 'center',
                    border: idx === 3 ? '2px solid rgba(39, 174, 96, 0.4)' : 'none'
                  }}
                >
                  <div style={{ fontSize: '0.7em', color: 'rgba(255,255,255,0.5)' }}>
                    {period.label}
                  </div>
                  <div style={{
                    fontSize: idx === 3 ? '0.95em' : '0.85em',
                    fontWeight: 'bold',
                    color: idx === 3 ? '#27ae60' : '#3498db',
                    marginTop: '3px'
                  }}>
                    +{formatMontant(period.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Détail des ajustements */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '10px',
            padding: '12px'
          }}>
            <div style={{ 
              fontSize: '0.8em', 
              color: 'rgba(255,255,255,0.5)', 
              marginBottom: '8px' 
            }}>
              Détail des ajustements ({recommendations.length})
            </div>
            {recommendations.map((rec, idx) => (
              <div
                key={rec.id || idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: idx < recommendations.length - 1 
                    ? '1px solid rgba(255,255,255,0.1)' 
                    : 'none'
                }}
              >
                <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.8)' }}>
                  {rec.accountName}
                  <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '8px' }}>
                    {formatMontant(rec.currentAmountMonthly || rec.currentAmount)} → {formatMontant(rec.newAmountMonthly || rec.newAmount)}
                  </span>
                </div>
                <div style={{ 
                  fontSize: '0.85em', 
                  fontWeight: 'bold', 
                  color: '#27ae60' 
                }}>
                  +{formatMontant(rec.monthlyRecovery)}
                </div>
              </div>
            ))}
          </div>

          {/* Message d'erreur */}
          {error && (
            <div style={{
              marginTop: '15px',
              padding: '12px',
              background: 'rgba(231, 76, 60, 0.2)',
              border: '1px solid rgba(231, 76, 60, 0.5)',
              borderRadius: '8px',
              color: '#e74c3c',
              fontSize: '0.9em',
              textAlign: 'center'
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer avec boutons */}
        <div style={{
          padding: '20px 25px',
          borderTop: '2px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.2)',
          gap: '15px'
        }}>
          <button
            onClick={handleReject}
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '14px 25px',
              borderRadius: '12px',
              border: '2px solid rgba(231, 76, 60, 0.5)',
              background: 'rgba(231, 76, 60, 0.1)',
              color: '#e74c3c',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '1em',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isProcessing ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            ✕ Refuser
          </button>
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            style={{
              flex: 1.5,
              padding: '14px 30px',
              borderRadius: '12px',
              border: 'none',
              background: isProcessing 
                ? 'rgba(39, 174, 96, 0.5)' 
                : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
              color: 'white',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '1em',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            {isProcessing ? (
              <>⏳ Application...</>
            ) : (
              <>✅ Appliquer l'optimisation</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PL4TOProposalModal;
