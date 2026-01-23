// 🧭 PL4TO - LANDING PAGE
// Page d'accueil avec branding Pl4to
// 🌍 i18n enabled
// ✨ Améliorations post-test Marie-Claude
// 🎨 Trajectoire GPS animée avec bulles

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

const LandingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      setIsNight(hour >= 20 || hour < 6);
    };
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Composant O animé (style Anneau de Sauron)
  const AnimatedO = ({ size = 45 }) => (
    <div style={{
      position: 'relative',
      width: `${size}px`,
      height: `${size}px`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: `${Math.max(3, size / 12)}px solid transparent`,
        background: 'linear-gradient(#040449, #040449) padding-box, linear-gradient(180deg, #ffd700, #ff8c00, #ff4500, #ffd700) border-box',
        animation: 'gps-ring-spin 3s linear infinite',
        boxShadow: '0 0 20px rgba(255, 165, 0, 0.6)'
      }} />
    </div>
  );

  // 🗺️ Milestones de la trajectoire GPS
  const milestones = [
    { emoji: '🏠', label: 'Départ', x: 80, y: 680, color: '#60a5fa' },
    { emoji: '🛡️', label: 'Urgence', x: 220, y: 580, color: '#22d3ee' },
    { emoji: '🎓', label: 'Enfant', x: 380, y: 560, color: '#22d3ee' },
    { emoji: '📚', label: 'Formation', x: 580, y: 580, color: '#22d3ee' },
    { emoji: '🌱', label: 'Voyage', x: 780, y: 560, color: '#22d3ee' },
    { emoji: '🏖️', label: 'Vacances', x: 900, y: 460, color: '#22d3ee' },
    { emoji: '🎯', label: 'Objectif', x: 1030, y: 380, color: '#22d3ee' },
    { emoji: '🧭', label: 'Liberté', x: 1155, y: 330, color: '#818cf8' }
  ];

  // 📍 Générer le path SVG pour la trajectoire
  const generatePath = () => {
    const points = milestones.map(m => `${m.x},${m.y}`);
    return `M ${points.join(' L ')}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #040449 0%, #0a0a2e 30%, #0f0f3d 50%, #0a0a2e 70%, #040449 100%)',
      transition: 'background 1s ease',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* 🌟 Étoiles de fond subtiles */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,0.15), transparent),
                          radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.1), transparent),
                          radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.15), transparent),
                          radial-gradient(2px 2px at 130px 80px, rgba(255,255,255,0.1), transparent),
                          radial-gradient(1px 1px at 160px 120px, rgba(255,255,255,0.15), transparent)`,
        backgroundSize: '200px 200px',
        opacity: 0.6,
        pointerEvents: 'none'
      }} />

      {/* Header simple */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
        maxWidth: '1400px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Logo PL4TO avec O animé - AGRANDI */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ 
            color: 'white', 
            fontSize: '2.4em', 
            fontWeight: 'bold',
            letterSpacing: '2px'
          }}>
            PL4T
          </span>
          <AnimatedO size={50} />
        </div>
        
        {/* Language Switcher + Bouton Connexion */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <LanguageSwitcher style="toggle" />
          
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '10px 25px',
              borderRadius: '25px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.25)';
              e.target.style.borderColor = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.15)';
              e.target.style.borderColor = 'rgba(255,255,255,0.3)';
            }}
          >
            {t('landing.login')}
          </button>
        </div>
      </header>

      {/* 🎯 Hero Section avec trajectoire GPS */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 40px',
        position: 'relative',
        minHeight: 'calc(100vh - 100px)'
      }}>
        
        {/* 🗺️ SVG Trajectoire GPS - En arrière-plan */}
        <svg 
          viewBox="0 0 1300 800" 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            maxWidth: '1300px',
            height: 'auto',
            zIndex: 1,
            opacity: 0.9
          }}
        >
          {/* Définitions des gradients */}
          <defs>
            {/* Gradient pour la trajectoire */}
            <linearGradient id="trajectoryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            
            {/* Glow filter pour la trajectoire */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            
            {/* Filter pour les bulles */}
            <filter id="bubbleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* 🛤️ Trajectoire principale - ligne courbe */}
          <path
            d={generatePath()}
            fill="none"
            stroke="url(#trajectoryGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            style={{
              strokeDasharray: '2000',
              strokeDashoffset: '0',
              animation: 'drawPath 3s ease-out forwards'
            }}
          />

          {/* 🔵 Point animé qui parcourt la trajectoire */}
          <circle r="8" fill="#22d3ee" filter="url(#bubbleGlow)">
            <animateMotion
              dur="8s"
              repeatCount="indefinite"
              path={generatePath()}
            />
          </circle>

          {/* 🎯 Bulles des milestones */}
          {milestones.map((milestone, index) => (
            <g key={index} style={{ animation: `fadeInBubble 0.5s ease-out ${index * 0.15}s forwards`, opacity: 0 }}>
              {/* Cercle de fond avec glow */}
              <circle
                cx={milestone.x}
                cy={milestone.y}
                r="35"
                fill="rgba(4, 4, 73, 0.8)"
                stroke={milestone.color}
                strokeWidth="2"
                filter="url(#bubbleGlow)"
              />
              {/* Emoji */}
              <text
                x={milestone.x}
                y={milestone.y + 8}
                textAnchor="middle"
                fontSize="28"
                style={{ userSelect: 'none' }}
              >
                {milestone.emoji}
              </text>
            </g>
          ))}
        </svg>

        {/* 📝 Contenu texte - Centré verticalement */}
        <div style={{
          position: 'relative',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 200px)',
          textAlign: 'center',
          paddingTop: '120px'
        }}>
          {/* Titre principal émotionnel */}
          <h1 style={{
            fontSize: 'clamp(2.5em, 5vw, 4em)',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '20px',
            textShadow: '0 4px 30px rgba(0,0,0,0.5)',
            lineHeight: '1.2'
          }}>
            {t('landing.discover')}
          </h1>

          {/* Sous-titre */}
          <p style={{
            fontSize: 'clamp(1.2em, 2.5vw, 1.6em)',
            color: 'rgba(255,255,255,0.9)',
            marginBottom: '15px',
            maxWidth: '700px',
            lineHeight: '1.5',
            textShadow: '0 2px 15px rgba(0,0,0,0.3)'
          }}>
            {t('landing.subtitle')}
          </p>

          {/* Tagline */}
          <p style={{
            fontSize: 'clamp(1em, 2vw, 1.3em)',
            color: 'rgba(255,255,255,0.75)',
            marginBottom: '40px',
            maxWidth: '600px',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            {t('landing.tagline')}
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            gap: '20px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '25px'
          }}>
            <button
              onClick={() => navigate('/register')}
              style={{
                background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                color: 'white',
                border: 'none',
                padding: '18px 40px',
                borderRadius: '50px',
                fontSize: '1.1em',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 8px 30px rgba(255, 152, 0, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px) scale(1.02)';
                e.target.style.boxShadow = '0 12px 40px rgba(255, 152, 0, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = '0 8px 30px rgba(255, 152, 0, 0.4)';
              }}
            >
              {t('landing.cta')}
            </button>

            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'transparent',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.5)',
                padding: '18px 40px',
                borderRadius: '50px',
                fontSize: '1.1em',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.1)';
                e.target.style.borderColor = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = 'rgba(255,255,255,0.5)';
              }}
            >
              👤 {t('auth.register.hasAccount')}
            </button>
          </div>

          {/* Badge "14 jours d'essai gratuit" */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '30px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              padding: '12px 28px',
              borderRadius: '30px',
              fontSize: '1.1em',
              fontWeight: 'bold',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ✨ {t('landing.ctaBadge')}
            </div>
          </div>

          {/* Badges de confiance */}
          <div style={{
            display: 'flex',
            gap: '30px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <span style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.95em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {t('landing.privacy')}
            </span>
            <span style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.95em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {t('landing.devices')}
            </span>
          </div>
        </div>
      </main>

      {/* 📊 Section Features - Scroll down */}
      <section style={{
        background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 100%)',
        padding: '80px 40px',
        position: 'relative',
        zIndex: 5
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Aperçu de l'app */}
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '60px',
            border: '1px solid rgba(255,255,255,0.1)',
            maxWidth: '900px',
            margin: '0 auto 60px'
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '12px',
              padding: '60px 40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '15px'
            }}>
              <div style={{
                width: '100%',
                maxWidth: '800px',
                height: '400px',
                background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.2) 0%, rgba(129, 140, 248, 0.2) 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed rgba(255,255,255,0.2)'
              }}>
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                  <div style={{ fontSize: '3em', marginBottom: '10px' }}>🧭</div>
                  <p style={{ fontSize: '1.2em', fontWeight: '600' }}>{t('landing.preview.title')}</p>
                  <p style={{ fontSize: '0.95em', opacity: 0.7, marginTop: '8px' }}>{t('landing.preview.subtitle')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '30px',
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            {/* Feature 1 - Ton futur, visualisé */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '35px 25px',
              border: '1px solid rgba(255,255,255,0.15)',
              transition: 'all 0.3s',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3em', marginBottom: '15px' }}>🗺️</div>
              <h3 style={{ 
                color: 'white', 
                fontSize: '1.3em', 
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                {t('landing.features.gps.title')}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
                {t('landing.features.gps.description')}
              </p>
            </div>

            {/* Feature 2 - Teste avant d'agir */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '35px 25px',
              border: '1px solid rgba(255,255,255,0.15)',
              transition: 'all 0.3s',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3em', marginBottom: '15px' }}>🧮</div>
              <h3 style={{ 
                color: 'white', 
                fontSize: '1.3em', 
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                {t('landing.features.calculator.title')}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
                {t('landing.features.calculator.description')}
              </p>
            </div>

            {/* Feature 3 - Tes destinations */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '35px 25px',
              border: '1px solid rgba(255,255,255,0.15)',
              transition: 'all 0.3s',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3em', marginBottom: '15px' }}>🎯</div>
              <h3 style={{ 
                color: 'white', 
                fontSize: '1.3em', 
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                {t('landing.features.goals.title')}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
                {t('landing.features.goals.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        position: 'relative',
        zIndex: 5
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.9em',
          marginBottom: '10px'
        }}>
          {t('landing.company')}
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.8em'
        }}>
          © 2025 Pl4to Inc. Tous droits réservés.
        </p>
      </footer>

      {/* CSS Animations */}
      <style>{`
        @keyframes gps-ring-spin {
          0% {
            transform: rotate(0deg);
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.6);
          }
          50% {
            box-shadow: 0 0 35px rgba(255, 165, 0, 0.9), 0 0 50px rgba(255, 69, 0, 0.5);
          }
          100% {
            transform: rotate(360deg);
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.6);
          }
        }
        
        @keyframes drawPath {
          0% {
            stroke-dashoffset: 2000;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes fadeInBubble {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
