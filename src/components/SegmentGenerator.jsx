/**
 * GPS Financier - SegmentGenerator Component
 * 
 * Modal pour générer automatiquement les segments budgétaires
 * S'affiche quand aucun segment n'existe dans la base de données
 */

import { useState } from 'react';

const SegmentGenerator = ({ onGenerate, onGenerateBatch, isLoading }) => {
  const [mode, setMode] = useState('batch'); // 'batch' ou 'full'
  const [batchSize, setBatchSize] = useState(50);
  const [targetYear, setTargetYear] = useState(2079);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress('Initialisation...');
    
    try {
      if (mode === 'batch') {
        setProgress(`Génération de ${batchSize} segments...`);
        await onGenerateBatch(batchSize);
        setProgress(`✅ ${batchSize} segments générés!`);
      } else {
        setProgress(`Génération jusqu'à ${targetYear}...`);
        await onGenerate(targetYear);
        setProgress(`✅ Segments générés jusqu'à ${targetYear}!`);
      }
      
      // Fermer après 2 secondes
      setTimeout(() => {
        setGenerating(false);
        setProgress(null);
      }, 2000);
      
    } catch (error) {
      setProgress(`❌ Erreur: ${error.message}`);
      setTimeout(() => {
        setGenerating(false);
        setProgress(null);
      }, 3000);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '550px',
        width: '100%',
        boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
        textAlign: 'center'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '2.5em'
          }}>
            🔮
          </div>
          
          <h2 style={{ 
            fontSize: '1.5em', 
            color: '#2c3e50', 
            marginBottom: '10px',
            fontWeight: 'bold'
          }}>
            Initialiser les Segments Budgétaires
          </h2>
          
          <p style={{ 
            color: '#7f8c8d', 
            fontSize: '0.95em',
            lineHeight: 1.6
          }}>
            Pour visualiser votre trajectoire financière future, nous devons calculer 
            les segments budgétaires basés sur votre budget actuel.
          </p>
        </div>

        {/* Progress indicator */}
        {generating && (
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.1), rgba(142, 68, 173, 0.05))',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}>
              {!progress?.startsWith('✅') && !progress?.startsWith('❌') && (
                <div style={{
                  width: '24px',
                  height: '24px',
                  border: '3px solid #9b59b6',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              <span style={{ 
                color: progress?.startsWith('❌') ? '#e74c3c' : '#9b59b6',
                fontWeight: '600'
              }}>
                {progress}
              </span>
            </div>
          </div>
        )}

        {/* Options */}
        {!generating && (
          <>
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <button
                onClick={() => setMode('batch')}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: mode === 'batch' ? '3px solid #9b59b6' : '2px solid #e0e0e0',
                  background: mode === 'batch' ? 'rgba(155, 89, 182, 0.1)' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '1.5em', marginBottom: '8px' }}>⚡</div>
                <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Rapide</div>
                <div style={{ fontSize: '0.8em', color: '#7f8c8d' }}>50 segments</div>
              </button>
              
              <button
                onClick={() => setMode('full')}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: mode === 'full' ? '3px solid #9b59b6' : '2px solid #e0e0e0',
                  background: mode === 'full' ? 'rgba(155, 89, 182, 0.1)' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '1.5em', marginBottom: '8px' }}>🔮</div>
                <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Complet</div>
                <div style={{ fontSize: '0.8em', color: '#7f8c8d' }}>Jusqu'à 2079</div>
              </button>
            </div>

            {/* Advanced options */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: 'none',
                border: 'none',
                color: '#9b59b6',
                cursor: 'pointer',
                fontSize: '0.85em',
                marginBottom: '15px'
              }}
            >
              {showAdvanced ? '▼ Masquer options' : '▶ Options avancées'}
            </button>

            {showAdvanced && (
              <div style={{
                background: '#f8f9fa',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '20px',
                textAlign: 'left'
              }}>
                {mode === 'batch' && (
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.85em', 
                      color: '#7f8c8d',
                      marginBottom: '6px'
                    }}>
                      Nombre de segments:
                    </label>
                    <input
                      type="number"
                      value={batchSize}
                      onChange={(e) => setBatchSize(parseInt(e.target.value) || 50)}
                      min="10"
                      max="500"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0',
                        fontSize: '0.95em',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}
                
                {mode === 'full' && (
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.85em', 
                      color: '#7f8c8d',
                      marginBottom: '6px'
                    }}>
                      Année cible:
                    </label>
                    <select
                      value={targetYear}
                      onChange={(e) => setTargetYear(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0',
                        fontSize: '0.95em',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value={2030}>2030</option>
                      <option value={2040}>2040</option>
                      <option value={2050}>2050</option>
                      <option value={2060}>2060</option>
                      <option value={2070}>2070</option>
                      <option value={2079}>2079 (Maximum)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                color: 'white',
                fontSize: '1.1em',
                fontWeight: 'bold',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(155, 89, 182, 0.4)'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(155, 89, 182, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(155, 89, 182, 0.4)';
              }}
            >
              🚀 Générer les segments
            </button>

            {/* Info */}
            <p style={{ 
              marginTop: '15px', 
              fontSize: '0.8em', 
              color: '#95a5a6'
            }}>
              {mode === 'batch' 
                ? `Génère ${batchSize} segments rapidement. Vous pourrez en ajouter plus tard.`
                : `Génère tous les segments jusqu'à ${targetYear}. Peut prendre quelques secondes.`
              }
            </p>
          </>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default SegmentGenerator;
