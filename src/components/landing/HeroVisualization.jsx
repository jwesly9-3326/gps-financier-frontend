// 🎨 HERO VISUALIZATION - Landing Page Tech Design
// Trajectoire animée de finances
// PL4TO - GPS Financier

import { useState, useEffect } from 'react';

const HeroVisualization = () => {
  const [animationStep, setAnimationStep] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  
  // Animation de la trajectoire
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Points de la trajectoire financière - 8 icônes
  const trajectoryPoints = [
    { x: 80, y: 680, label: 'Départ', amount: '0 $', icon: '🏠' },
    { x: 220, y: 580, label: 'Urgence', amount: '5 000 $', icon: '🛡️' },
    { x: 380, y: 560, label: 'Enfant', amount: '10 000 $', icon: '🎓' },
    { x: 580, y: 580, label: 'Formation', amount: '15 000 $', icon: '📚' },
    { x: 780, y: 560, label: 'Voyage', amount: '20 000 $', icon: '🌱' },
    { x: 900, y: 460, label: 'Vacances', amount: '30 000 $', icon: '🏖️' },
    { x: 1030, y: 380, label: 'Objectif', amount: '50 000 $', icon: '🎯' },
    { x: 1155, y: 330, label: 'Liberté', amount: '500 000 $', icon: '🧭' },
  ];

  // Générer le path SVG pour la courbe principale (trajectoire financière)
  const generatePath = () => {
    const points = trajectoryPoints;
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX1 = prev.x + (curr.x - prev.x) / 3;
      const cpY1 = prev.y;
      const cpX2 = prev.x + 2 * (curr.x - prev.x) / 3;
      const cpY2 = curr.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }
    
    return path;
  };

  // Position du point animé sur la trajectoire
  const getAnimatedPosition = () => {
    const progress = animationStep / 100;
    const totalPoints = trajectoryPoints.length - 1;
    const segment = Math.floor(progress * totalPoints);
    const segmentProgress = (progress * totalPoints) - segment;
    
    if (segment >= totalPoints) {
      return trajectoryPoints[totalPoints];
    }
    
    const start = trajectoryPoints[segment];
    const end = trajectoryPoints[segment + 1];
    
    return {
      x: start.x + (end.x - start.x) * segmentProgress,
      y: start.y + (end.y - start.y) * segmentProgress
    };
  };

  const animatedPos = getAnimatedPosition();

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 0
    }}>

      {/* Visualization SVG */}
      <svg 
        viewBox="0 0 1200 800" 
        preserveAspectRatio="xMidYMid slice"
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible'
        }}
      >
        {/* Grille de fond */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
          </pattern>
          
          {/* Gradient pour la trajectoire principale - Bleu électrique doux */}
          <linearGradient id="trajectoryGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          
          {/* Glow effect */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Stronger glow for animated point */}
          <filter id="strongGlow">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Grille */}
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Trajectoire principale (colorée) - SANS zone ombrée en dessous */}
        <path
          d={generatePath()}
          fill="none"
          stroke="url(#trajectoryGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#glow)"
          style={{
            strokeDasharray: '3000',
            strokeDashoffset: 3000 - (animationStep * 30),
            transition: 'stroke-dashoffset 0.05s linear'
          }}
        />
        
        {/* Points de destination */}
        {trajectoryPoints.map((point, index) => (
          <g 
            key={index}
            onMouseEnter={() => setHoveredPoint(index)}
            onMouseLeave={() => setHoveredPoint(null)}
            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          >
            {/* Cercle de fond */}
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredPoint === index ? 15 : 11}
              fill={index === 0 ? 'rgba(96, 165, 250, 0.3)' : 
                    index === trajectoryPoints.length - 1 ? 'rgba(129, 140, 248, 0.3)' :
                    'rgba(34, 211, 238, 0.3)'}
              style={{ transition: 'r 0.3s ease' }}
            />
            
            {/* Cercle principal */}
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredPoint === index ? 9 : 7}
              fill={index === 0 ? '#60a5fa' : 
                    index === trajectoryPoints.length - 1 ? '#818cf8' :
                    '#22d3ee'}
              filter="url(#glow)"
              style={{ transition: 'r 0.3s ease' }}
            />
            
            {/* Icône */}
            <text
              x={point.x}
              y={point.y + 2.5}
              textAnchor="middle"
              fontSize="7"
              style={{ pointerEvents: 'none' }}
            >
              {point.icon}
            </text>
            
            {/* Label au hover uniquement */}
            {hoveredPoint === index && (
              <g>
                <rect
                  x={point.x - 55}
                  y={point.y - 45}
                  width="110"
                  height="38"
                  rx="8"
                  fill="rgba(0,0,0,0.85)"
                  stroke={index === 0 ? '#60a5fa' : 
                          index === trajectoryPoints.length - 1 ? '#818cf8' :
                          '#22d3ee'}
                  strokeWidth="2"
                />
                <text
                  x={point.x}
                  y={point.y - 27}
                  textAnchor="middle"
                  fill="white"
                  fontSize="13"
                  fontWeight="600"
                >
                  {point.label}
                </text>
                <text
                  x={point.x}
                  y={point.y - 12}
                  textAnchor="middle"
                  fill={index === 0 ? '#60a5fa' : 
                        index === trajectoryPoints.length - 1 ? '#818cf8' :
                        '#22d3ee'}
                  fontSize="12"
                  fontWeight="bold"
                >
                  {point.amount}
                </text>
              </g>
            )}
          </g>
        ))}
        
        {/* Point animé qui suit la trajectoire */}
        <circle
          cx={animatedPos.x}
          cy={animatedPos.y}
          r="5"
          fill="#22d3ee"
          filter="url(#strongGlow)"
        >
          <animate
            attributeName="r"
            values="4;6;4"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>

      </svg>
      
      {/* CSS pour animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default HeroVisualization;
