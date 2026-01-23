// 📍 GPS FINANCIER - TIMELINE HORIZONTALE
// Ligne de temps de navigation temporelle (2025 → 2076)

import { useState } from 'react';

const Timeline = () => {
  const currentYear = new Date().getFullYear(); // 2025
  const startYear = currentYear;
  const endYear = 2076; // 54 ans de projection (2025 + 51 = 2076)
  
  // État pour l'année sélectionnée (pour interaction future)
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Génération des points de la timeline (tous les 5 ans + année actuelle)
  const generateTimelinePoints = () => {
    const points = [];
    
    // Toujours inclure l'année de départ
    points.push({ year: startYear, label: `${startYear}`, isCurrent: true });
    
    // Points tous les 5 ans
    for (let year = startYear + 5; year <= endYear; year += 5) {
      points.push({ 
        year, 
        label: `${year}`,
        isCurrent: false 
      });
    }
    
    // S'assurer que l'année finale est incluse si pas déjà
    if (points[points.length - 1].year !== endYear) {
      points.push({ year: endYear, label: `${endYear}`, isCurrent: false });
    }
    
    return points;
  };

  const timelinePoints = generateTimelinePoints();

  // Gestionnaire de clic (pour interaction future avec filtres)
  const handleYearClick = (year) => {
    setSelectedYear(year);
    console.log(`📍 Navigation vers l'année: ${year}`);
    // TODO: Connecter avec state global pour filtrer les données
  };

  return (
    <div className="gps-timeline">
      {/* Label de la timeline */}
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '15px', 
        color: '#34495e',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{ fontSize: '1.2em' }}>📍</span>
        <span>Ligne de Temps - Naviguez dans votre avenir financier</span>
      </div>

      {/* Barre de timeline */}
      <div style={{
        position: 'relative',
        height: '60px',
        background: 'linear-gradient(90deg, #a8edea 0%, #fed6e3 50%, #ffd89b 100%)',
        borderRadius: '30px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}>
        {/* Container des marqueurs */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          position: 'relative'
        }}>
          {timelinePoints.map((point, index) => (
            <div
              key={point.year}
              onClick={() => handleYearClick(point.year)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                cursor: 'pointer',
                transition: 'transform 0.3s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {/* Point marqueur */}
              <div style={{
                width: point.isCurrent ? '24px' : '16px',
                height: point.isCurrent ? '24px' : '16px',
                background: point.isCurrent ? '#e74c3c' : selectedYear === point.year ? '#3498db' : 'white',
                border: point.isCurrent 
                  ? '3px solid #c0392b' 
                  : selectedYear === point.year 
                    ? '3px solid #2980b9'
                    : '3px solid #3498db',
                borderRadius: '50%',
                marginBottom: '8px',
                transition: 'all 0.3s',
                boxShadow: point.isCurrent 
                  ? '0 0 20px rgba(231, 76, 60, 0.6)' 
                  : selectedYear === point.year
                    ? '0 0 15px rgba(52, 152, 219, 0.5)'
                    : 'none',
                animation: point.isCurrent ? 'pulse 2s infinite' : 'none'
              }} />

              {/* Label année */}
              <span style={{
                fontSize: point.isCurrent ? '0.95em' : '0.85em',
                fontWeight: point.isCurrent || selectedYear === point.year ? '700' : '600',
                color: '#2c3e50',
                whiteSpace: 'nowrap'
              }}>
                {point.label}
              </span>

              {/* Badge "VOUS ÊTES ICI" pour année actuelle */}
              {point.isCurrent && (
                <div style={{
                  position: 'absolute',
                  top: '-35px',
                  background: '#e74c3c',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.7em',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(231, 76, 60, 0.3)'
                }}>
                  PRÉSENT
                </div>
              )}

              {/* Labels contexte pour points clés */}
              {index === 0 && !point.isCurrent && (
                <span style={{
                  fontSize: '0.7em',
                  color: '#7f8c8d',
                  marginTop: '4px'
                }}>
                  Début
                </span>
              )}
              {index === timelinePoints.length - 1 && (
                <span style={{
                  fontSize: '0.7em',
                  color: '#7f8c8d',
                  marginTop: '4px'
                }}>
                  Horizon
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Animation CSS pour le pulse */}
      <style>{`
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1); 
            opacity: 1;
          }
          50% { 
            transform: scale(1.1); 
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
};

export default Timeline;