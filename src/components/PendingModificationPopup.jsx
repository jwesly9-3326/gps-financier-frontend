import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Popup qui s'affiche quand des modifications planifiées sont arrivées à échéance
 * Permet à l'utilisateur de les appliquer ou les rejeter
 */
const PendingModificationPopup = ({ 
  modifications, 
  onApply, 
  onReject, 
  onClose 
}) => {
  const { getToken } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!modifications || modifications.length === 0) return null;

  const current = modifications[currentIndex];
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatMontant = (val) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(val || 0);
  };

  const handleApply = async () => {
    setIsProcessing(true);
    try {
      const token = await getToken();
      await fetch(`http://localhost:3000/api/budget-modifications/${current.id}/apply`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (onApply) onApply(current);
      
      // Passer à la modification suivante ou fermer
      if (currentIndex < modifications.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Erreur application:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      const token = await getToken();
      await fetch(`http://localhost:3000/api/budget-modifications/${current.id}/reject`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (onReject) onReject(current);
      
      // Passer à la modification suivante ou fermer
      if (currentIndex < modifications.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Erreur rejet:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const entrees = current.modifications?.entrees || [];
  const sorties = current.modifications?.sorties || [];
  const totalEntrees = entrees.reduce((sum, e) => sum + (parseFloat(e.montant) || 0), 0);
  const totalSorties = sorties.reduce((sum, s) => sum + (parseFloat(s.montant) || 0), 0);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10001,
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)',
        borderRadius: '25px',
        width: '90%',
        maxWidth: '600px',
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        border: '2px solid rgba(243, 156, 18, 0.5)',
        animation: 'pulse 2s infinite'
      }}>
        {/* Header avec alerte */}
        <div style={{
          background: 'linear-gradient(135deg, #f39c12, #e74c3c)',
          padding: '25px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3em', marginBottom: '10px' }}>⚠️</div>
          <h2 style={{ margin: 0, color: 'white', fontSize: '1.4em' }}>
            Modification planifiée à appliquer
          </h2>
          <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.9)' }}>
            {modifications.length > 1 && (
              <span style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '3px 10px',
                borderRadius: '15px',
                marginRight: '10px'
              }}>
                {currentIndex + 1} / {modifications.length}
              </span>
            )}
            Date d'effet : {formatDate(current.effectiveDate)}
          </p>
        </div>

        {/* Description */}
        {current.description && (
          <div style={{
            padding: '15px 25px',
            background: 'rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <p style={{ margin: 0, color: 'white', fontStyle: 'italic' }}>
              📝 {current.description}
            </p>
          </div>
        )}

        {/* Résumé des modifications */}
        <div style={{ padding: '25px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '20px'
          }}>
            {/* Entrées */}
            <div style={{
              background: 'rgba(39, 174, 96, 0.15)',
              borderRadius: '15px',
              padding: '20px',
              border: '1px solid rgba(39, 174, 96, 0.3)'
            }}>
              <div style={{
                color: '#27ae60',
                fontWeight: 'bold',
                marginBottom: '10px',
                fontSize: '0.9em'
              }}>
                💰 ENTRÉES ({entrees.length})
              </div>
              <div style={{
                fontSize: '1.5em',
                fontWeight: 'bold',
                color: '#27ae60'
              }}>
                {formatMontant(totalEntrees)}
              </div>
              {entrees.slice(0, 3).map((e, idx) => (
                <div key={idx} style={{
                  fontSize: '0.8em',
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: '5px'
                }}>
                  • {e.description}: {formatMontant(e.montant)}
                </div>
              ))}
              {entrees.length > 3 && (
                <div style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)', marginTop: '5px' }}>
                  +{entrees.length - 3} autres...
                </div>
              )}
            </div>

            {/* Sorties */}
            <div style={{
              background: 'rgba(231, 76, 60, 0.15)',
              borderRadius: '15px',
              padding: '20px',
              border: '1px solid rgba(231, 76, 60, 0.3)'
            }}>
              <div style={{
                color: '#e74c3c',
                fontWeight: 'bold',
                marginBottom: '10px',
                fontSize: '0.9em'
              }}>
                💸 SORTIES ({sorties.length})
              </div>
              <div style={{
                fontSize: '1.5em',
                fontWeight: 'bold',
                color: '#e74c3c'
              }}>
                {formatMontant(totalSorties)}
              </div>
              {sorties.slice(0, 3).map((s, idx) => (
                <div key={idx} style={{
                  fontSize: '0.8em',
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: '5px'
                }}>
                  • {s.description}: {formatMontant(s.montant)}
                </div>
              ))}
              {sorties.length > 3 && (
                <div style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)', marginTop: '5px' }}>
                  +{sorties.length - 3} autres...
                </div>
              )}
            </div>
          </div>

          {/* Message explicatif */}
          <div style={{
            background: 'rgba(102, 126, 234, 0.1)',
            borderRadius: '12px',
            padding: '15px',
            marginBottom: '20px',
            border: '1px solid rgba(102, 126, 234, 0.3)'
          }}>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.9em' }}>
              🔄 <strong>Appliquer</strong> : Le budget principal sera mis à jour avec ces modifications.<br/>
              ❌ <strong>Rejeter</strong> : Les modifications seront ignorées et ne seront pas appliquées.
            </p>
          </div>
        </div>

        {/* Boutons d'action */}
        <div style={{
          padding: '20px 25px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          gap: '15px'
        }}>
          <button
            onClick={handleReject}
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '15px 25px',
              background: 'rgba(231, 76, 60, 0.2)',
              border: '2px solid #e74c3c',
              borderRadius: '12px',
              color: '#e74c3c',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1em'
            }}
          >
            ❌ Rejeter
          </button>
          <button
            onClick={handleApply}
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '15px 25px',
              background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1em',
              boxShadow: '0 4px 15px rgba(39, 174, 96, 0.4)'
            }}
          >
            {isProcessing ? '⏳ Traitement...' : '✅ Appliquer au budget'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 0 rgba(243, 156, 18, 0.4); }
          50% { box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 15px rgba(243, 156, 18, 0); }
        }
      `}</style>
    </div>
  );
};

export default PendingModificationPopup;
