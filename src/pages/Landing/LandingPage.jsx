// 🧭 PL4TO - LANDING PAGE
// Page d'accueil avec branding Pl4to
// 🌍 i18n enabled
// ✨ Améliorations post-test Marie-Claude
// 🎨 Trajectoire GPS animée avec bulles

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import { useTheme } from '../../context/ThemeContext';

const LandingPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [isNight, setIsNight] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // 📱 Détecter si on est en mode PWA (standalone)
  const [isPWA, setIsPWA] = useState(false);

  // 🎨 Couleurs selon le thème
  const colors = {
    // Backgrounds
    pageBg: isDark 
      ? 'linear-gradient(180deg, #040449 0%, #0a0a2e 30%, #0f0f3d 50%, #0a0a2e 70%, #040449 100%)'
      : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 30%, #f1f5f9 50%, #e2e8f0 70%, #f8fafc 100%)',
    ringBg: isDark ? '#040449' : '#f8fafc',
    // Textes
    textPrimary: isDark ? 'white' : '#1e293b',
    textSecondary: isDark ? 'rgba(255,255,255,0.9)' : '#334155',
    textMuted: isDark ? 'rgba(255,255,255,0.7)' : '#64748b',
    textSubtle: isDark ? 'rgba(255,255,255,0.5)' : '#94a3b8',
    // Cartes et bordures
    cardBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
    cardBorder: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
    cardHover: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,1)',
    // Boutons
    btnSecondaryBg: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
    btnSecondaryBorder: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
    btnSecondaryText: isDark ? 'white' : '#1e293b',
    btnSecondaryHoverBg: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)',
    btnSecondaryHoverBorder: isDark ? 'white' : '#1e293b',
    // Grille et étoiles
    gridColor: isDark ? 'rgba(99, 102, 241, 0.04)' : 'rgba(99, 102, 241, 0.08)',
    starsOpacity: isDark ? 0.6 : 0,
    // Trajectoire
    trajGradientStart: isDark ? 'rgba(129, 140, 248, 0.8)' : 'rgba(99, 102, 241, 0.9)',
    trajGradientEnd: isDark ? 'rgba(34, 197, 94, 0.8)' : 'rgba(34, 197, 94, 0.9)',
    // Overlay footer
    footerOverlay: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
  };

  // Détecter la taille de l'écran
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Détecter le mode PWA (standalone)
  useEffect(() => {
    setIsPWA(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

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
        background: `linear-gradient(${colors.ringBg}, ${colors.ringBg}) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box`,
        animation: 'gps-ring-spin 3s linear infinite',
        boxShadow: '0 0 20px rgba(255, 165, 0, 0.6)'
      }} />
    </div>
  );

  // 🗺️ Points de la trajectoire financière avec icônes
  // 8 points pour desktop
  const trajectoryPoints = [
    { x: 50, y: 400, icon: '🏠', color: '#818cf8' },
    { x: 200, y: 380, icon: '🛡️', color: '#a5b4fc' },
    { x: 370, y: 340, icon: '🎓', color: '#fbbf24' },
    { x: 540, y: 350, icon: '📚', color: '#f59e0b' },
    { x: 710, y: 330, icon: '🌱', color: '#f59e0b' },
    { x: 900, y: 330, icon: '🏖️', color: '#f97316' },
    { x: 1100, y: 350, icon: '🎯', color: '#22c55e' },
    { x: 1300, y: 330, icon: '🧭', color: '#22c55e' }
  ];

  // 5 points simplifiés pour mobile
  const mobileTrajectoryPoints = [
    { x: 30, y: 170, icon: '🏠', color: '#818cf8' },
    { x: 100, y: 140, icon: '🛡️', color: '#a5b4fc' },
    { x: 180, y: 100, icon: '🎓', color: '#fbbf24' },
    { x: 280, y: 60, icon: '🎯', color: '#22c55e' },
    { x: 370, y: 30, icon: '🧭', color: '#22c55e' }
  ];

  // Points actifs selon la taille d'écran
  const activePoints = isMobile ? mobileTrajectoryPoints : trajectoryPoints;

  // 📍 Générer le path SVG pour la trajectoire financière (courbe lisse)
  const generatePath = (points) => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      
      // Points de contrôle pour courbe de Bézier
      const cp1x = prev.x + (curr.x - prev.x) * 0.5;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) * 0.5;
      const cp2y = curr.y;
      
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
    }
    
    return path;
  };

  // 💵 Formater les montants selon la langue
  const formatAmount = (amount) => {
    return i18n.language === 'fr' ? `${amount} $` : `$${amount}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.pageBg,
      transition: 'background 0.5s ease',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* 🌟 Étoiles de fond subtiles - visible seulement en dark mode */}
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
        opacity: colors.starsOpacity,
        pointerEvents: 'none',
        transition: 'opacity 0.5s ease'
      }} />
      
      {/* 🟦 Quadrillage/Grille en arrière-plan - style très subtil */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(${colors.gridColor} 1px, transparent 1px),
          linear-gradient(90deg, ${colors.gridColor} 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        opacity: 0.6,
        pointerEvents: 'none'
      }} />
      
      {/* Lignes horizontales très subtiles */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 49px,
            rgba(99, 102, 241, 0.02) 49px,
            rgba(99, 102, 241, 0.02) 50px
          )
        `,
        opacity: 0.5,
        pointerEvents: 'none'
      }} />

      {/* Header responsive */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        // Mobile PWA: 100px (safe-area pour notch)
        // Mobile Web: 45px (barre d'adresse existe déjà)
        // Desktop: 20px
        padding: isMobile 
          ? (isPWA ? '100px 20px 15px 20px' : '45px 20px 15px 20px') 
          : '20px 60px 20px 120px',
        maxWidth: '1400px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Logo PL4TO avec O animé */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px' }}>
          <span style={{ 
            color: colors.textPrimary, 
            fontSize: isMobile ? '1.5em' : '2.4em', 
            fontWeight: 'bold',
            letterSpacing: '2px',
            transition: 'color 0.3s ease'
          }}>
            PL4T
          </span>
          <AnimatedO size={isMobile ? 32 : 50} />
        </div>
        
        {/* Language Switcher + Theme Switch + Bouton Connexion */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '15px' }}>
          <LanguageSwitcher style="toggle" />
          
          {/* 🌙☀️ Switch de thème */}
          <button
            onClick={toggleTheme}
            style={{
              background: colors.btnSecondaryBg,
              border: `2px solid ${colors.btnSecondaryBorder}`,
              color: colors.btnSecondaryText,
              padding: isMobile ? '8px 12px' : '10px 14px',
              borderRadius: '25px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: isMobile ? '0.9em' : '1em'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = colors.btnSecondaryHoverBg;
              e.target.style.borderColor = colors.btnSecondaryHoverBorder;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = colors.btnSecondaryBg;
              e.target.style.borderColor = colors.btnSecondaryBorder;
            }}
            title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          
          {/* Bouton Connexion - caché sur mobile car déjà dans CTA "Déjà membre?" */}
          {!isMobile && (
            <button
              onClick={() => navigate('/login')}
              style={{
                background: colors.btnSecondaryBg,
                border: `2px solid ${colors.btnSecondaryBorder}`,
                color: colors.btnSecondaryText,
                padding: '10px 25px',
                borderRadius: '25px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = colors.btnSecondaryHoverBg;
                e.target.style.borderColor = colors.btnSecondaryHoverBorder;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = colors.btnSecondaryBg;
                e.target.style.borderColor = colors.btnSecondaryBorder;
              }}
            >
              {t('landing.login')}
            </button>
          )}

          {/* 🏢 Bouton Conseiller/Cabinet - Desktop et Mobile */}
          <button
            onClick={() => navigate('/pro')}
            style={{
              background: colors.btnSecondaryBg,
              border: `2px solid ${colors.btnSecondaryBorder}`,
              color: colors.btnSecondaryText,
              padding: isMobile ? '8px 14px' : '10px 22px',
              borderRadius: '25px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s',
              fontSize: isMobile ? '0.8em' : '0.9em',
              backdropFilter: 'blur(10px)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = colors.btnSecondaryHoverBg;
              e.target.style.borderColor = colors.btnSecondaryHoverBorder;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = colors.btnSecondaryBg;
              e.target.style.borderColor = colors.btnSecondaryBorder;
            }}
          >
            🏢 {isMobile ? 'Pro' : t('landing.proButton', 'Conseiller / Cabinet')}
          </button>
        </div>
      </header>

      {/* 💰 Axe Y (Vertical) - Responsive */}
      <div style={{
        position: 'fixed',
        bottom: isMobile ? '120px' : '50px',
        left: isMobile ? '5px' : '15px',
        top: isMobile ? '150px' : '100px',
        display: 'flex',
        flexDirection: 'column-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        zIndex: 5,
        opacity: isMobile ? 0.15 : 0.25,
        pointerEvents: 'none'
      }}>
        {(isMobile ? ['1K', '25K', '100K', '500K'] : ['50', '250', '1K', '5K', '25K', '100K', '500K', '1M']).map((amount, i) => (
          <span key={i} style={{
            color: colors.textMuted,
            fontSize: isMobile ? '7px' : '9px',
            fontFamily: 'monospace'
          }}>
            {formatAmount(amount)}
          </span>
        ))}
      </div>
      
      {/* 📅 Axe X (Horizontal) - Responsive */}
      <div style={{
        position: 'fixed',
        bottom: isMobile ? '10px' : '15px',
        left: isMobile ? '20px' : '50px',
        right: isMobile ? '20px' : '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 5,
        opacity: isMobile ? 0.15 : 0.25,
        pointerEvents: 'none'
      }}>
        {(isMobile ? ['2026', '2035', '2045', '2060'] : ['2026', '2030', '2035', '2040', '2045', '2050', '2055', '2060']).map((year, i) => (
          <span key={i} style={{
            color: colors.textMuted,
            fontSize: isMobile ? '7px' : '9px',
            fontFamily: 'monospace'
          }}>
            {year}
          </span>
        ))}
      </div>
      
      {/* 🗺️ SVG Trajectoire Financière - Responsive */}
      <svg 
        viewBox={isMobile ? "0 0 400 200" : "0 0 1400 450"}
        style={{
          position: isMobile ? 'absolute' : 'fixed',
          bottom: isMobile ? '100px' : '50px',
          left: isMobile ? '10px' : '50px',
          right: isMobile ? '10px' : '30px',
          height: isMobile ? '20vh' : '55vh',
          zIndex: 3,
          opacity: isMobile ? 0.7 : 1
        }}
        preserveAspectRatio={isMobile ? "xMidYMid meet" : "none"}
      >
        {/* Définitions des gradients */}
        <defs>
          {/* Gradient pour la trajectoire financière (bleu -> orange -> vert) */}
          <linearGradient id="trajectoryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.7" />
            <stop offset="20%" stopColor="#818cf8" />
            <stop offset="40%" stopColor="#d4d4d8" />
            <stop offset="55%" stopColor="#fbbf24" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          
          {/* Glow filter pour la trajectoire */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Filter pour les points */}
          <filter id="pointGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* 🛤️ Trajectoire principale - courbe financière */}
        <path
          d={generatePath(activePoints)}
          fill="none"
          stroke="url(#trajectoryGradient)"
          strokeWidth={isMobile ? "3" : "4"}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
          style={{
            strokeDasharray: '3000',
            strokeDashoffset: '0',
            animation: 'drawPath 3s ease-out forwards'
          }}
        />

        {/* 🟠 Points avec icônes le long de la trajectoire */}
        {activePoints.map((point, index) => (
          <g key={index} style={{ animation: `fadeInBubble 0.5s ease-out ${index * 0.15}s forwards`, opacity: 0 }}>
            {/* Halo extérieur */}
            <circle
              cx={point.x}
              cy={point.y}
              r={isMobile ? "16" : "22"}
              fill="none"
              stroke={point.color}
              strokeWidth="2"
              strokeOpacity="0.4"
            />
            {/* Cercle de fond */}
            <circle
              cx={point.x}
              cy={point.y}
              r={isMobile ? "12" : "16"}
              fill="rgba(4, 4, 73, 0.9)"
              stroke={point.color}
              strokeWidth="2"
              filter="url(#pointGlow)"
            />
            {/* Icône emoji */}
            <text
              x={point.x}
              y={point.y + (isMobile ? 4 : 5)}
              textAnchor="middle"
              fontSize={isMobile ? "10" : "14"}
              style={{ userSelect: 'none' }}
            >
              {point.icon}
            </text>
          </g>
        ))}

        {/* 🔵 Point animé qui parcourt la trajectoire */}
        <circle r={isMobile ? "3" : "5"} fill="#fbbf24" filter="url(#pointGlow)">
          <animateMotion
            dur="10s"
            repeatCount="indefinite"
            path={generatePath(activePoints)}
          />
        </circle>
      </svg>

      {/* 🎯 Hero Section avec trajectoire GPS */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: isMobile ? '0 25px' : '0 40px',
        position: 'relative',
        minHeight: 'calc(100vh - 100px)'
      }}>
        
        {/* 📝 Contenu texte - Centré verticalement */}
        <div style={{
          position: 'relative',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 250px)',
          textAlign: 'center',
          paddingTop: '60px'
        }}>
          {/* Titre principal - L'invention de PL4TO */}
          <h1 style={{
            fontSize: 'clamp(2.5em, 5vw, 4em)',
            fontWeight: 'bold',
            color: colors.textPrimary,
            marginBottom: '20px',
            textShadow: isDark ? '0 4px 30px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.1)',
            lineHeight: '1.2',
            transition: 'color 0.3s ease'
          }}>
            {t('landing.subtitle')}
          </h1>

          {/* Sous-titre - Vois enfin où tu vas */}
          <p style={{
            fontSize: 'clamp(1.2em, 2.5vw, 1.6em)',
            color: colors.textSecondary,
            marginBottom: '15px',
            maxWidth: '700px',
            lineHeight: '1.5',
            textShadow: isDark ? '0 2px 15px rgba(0,0,0,0.3)' : 'none',
            transition: 'color 0.3s ease'
          }}>
            {t('landing.discover')}
          </p>

          {/* Tagline - Finis l'incertitude */}
          <p style={{
            fontSize: 'clamp(1em, 2vw, 1.3em)',
            color: colors.textMuted,
            marginBottom: '40px',
            maxWidth: '600px',
            textShadow: isDark ? '0 2px 10px rgba(0,0,0,0.3)' : 'none',
            transition: 'color 0.3s ease'
          }}>
            {t('landing.tagline')}
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '25px',
            width: isMobile ? '100%' : 'auto'
          }}>
            <button
              onClick={() => navigate('/register')}
              style={{
                background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                color: 'white',
                border: 'none',
                padding: isMobile ? '16px 30px' : '18px 40px',
                borderRadius: '50px',
                fontSize: isMobile ? '1em' : '1.1em',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 8px 30px rgba(255, 152, 0, 0.4)',
                width: isMobile ? '100%' : 'auto',
                maxWidth: isMobile ? '280px' : 'none'
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
                color: colors.btnSecondaryText,
                border: `2px solid ${colors.btnSecondaryBorder}`,
                padding: '18px 40px',
                borderRadius: '50px',
                fontSize: '1.1em',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = colors.btnSecondaryHoverBg;
                e.target.style.borderColor = colors.btnSecondaryHoverBorder;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = colors.btnSecondaryBorder;
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
              color: colors.textMuted,
              fontSize: '0.95em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {t('landing.privacy')}
            </span>
            <span style={{
              color: colors.textMuted,
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
        background: `linear-gradient(180deg, transparent 0%, ${colors.footerOverlay} 100%)`,
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
            background: colors.cardBg,
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '60px',
            border: `1px solid ${colors.cardBorder}`,
            maxWidth: '900px',
            margin: '0 auto 60px',
            boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.08)'
          }}>
            <div style={{
              background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
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
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(96, 165, 250, 0.2) 0%, rgba(129, 140, 248, 0.2) 100%)'
                  : 'linear-gradient(135deg, rgba(96, 165, 250, 0.15) 0%, rgba(129, 140, 248, 0.15) 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px dashed ${colors.cardBorder}`
              }}>
                <div style={{ textAlign: 'center', color: colors.textMuted }}>
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
              background: colors.cardBg,
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '35px 25px',
              border: `1px solid ${colors.cardBorder}`,
              transition: 'all 0.3s',
              textAlign: 'center',
              boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.08)'
            }}>
              <div style={{ fontSize: '3em', marginBottom: '15px' }}>🗺️</div>
              <h3 style={{ 
                color: colors.textPrimary, 
                fontSize: '1.3em', 
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                {t('landing.features.gps.title')}
              </h3>
              <p style={{ color: colors.textMuted, lineHeight: '1.6' }}>
                {t('landing.features.gps.description')}
              </p>
            </div>

            {/* Feature 2 - Teste avant d'agir */}
            <div style={{
              background: colors.cardBg,
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '35px 25px',
              border: `1px solid ${colors.cardBorder}`,
              transition: 'all 0.3s',
              textAlign: 'center',
              boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.08)'
            }}>
              <div style={{ fontSize: '3em', marginBottom: '15px' }}>🧮</div>
              <h3 style={{ 
                color: colors.textPrimary, 
                fontSize: '1.3em', 
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                {t('landing.features.calculator.title')}
              </h3>
              <p style={{ color: colors.textMuted, lineHeight: '1.6' }}>
                {t('landing.features.calculator.description')}
              </p>
            </div>

            {/* Feature 3 - Tes destinations */}
            <div style={{
              background: colors.cardBg,
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '35px 25px',
              border: `1px solid ${colors.cardBorder}`,
              transition: 'all 0.3s',
              textAlign: 'center',
              boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.08)'
            }}>
              <div style={{ fontSize: '3em', marginBottom: '15px' }}>🎯</div>
              <h3 style={{ 
                color: colors.textPrimary, 
                fontSize: '1.3em', 
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                {t('landing.features.goals.title')}
              </h3>
              <p style={{ color: colors.textMuted, lineHeight: '1.6' }}>
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
        borderTop: `1px solid ${colors.cardBorder}`,
        position: 'relative',
        zIndex: 5
      }}>
        <p style={{
          color: colors.textSubtle,
          fontSize: '0.9em',
          marginBottom: '10px'
        }}>
          {t('landing.company')}
        </p>
        <p style={{
          color: colors.textSubtle,
          fontSize: '0.8em',
          opacity: 0.8
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
            stroke-dashoffset: 3000;
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
