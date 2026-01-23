// 🎨 THEME CONTEXT - Gestion Dark/Light/Auto Mode
// Similaire à i18n pour la langue, mais pour les couleurs

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

// Palette de couleurs
export const themes = {
  dark: {
    name: 'dark',
    // Arrière-plans
    background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
    backgroundSolid: '#040449',
    backgroundSecondary: '#100261',
    
    // Sidebar & Header
    sidebar: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
    header: '#040449',
    
    // Cartes
    card: 'rgba(255,255,255,0.1)',
    cardHover: 'rgba(255,255,255,0.15)',
    cardSolid: 'rgba(0,0,0,0.2)',
    
    // Textes
    text: 'white',
    textSecondary: 'rgba(255,255,255,0.7)',
    textMuted: 'rgba(255,255,255,0.5)',
    
    // Bordures
    border: 'rgba(255,255,255,0.1)',
    borderLight: 'rgba(255,255,255,0.05)',
    
    // Inputs
    inputBackground: 'rgba(255,255,255,0.1)',
    inputBorder: 'rgba(255,255,255,0.2)',
    inputText: 'white',
    inputPlaceholder: 'rgba(255,255,255,0.5)',
    
    // Overlays
    overlay: 'rgba(0,0,0,0.5)',
    modalBackground: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    
    // Shadows
    shadow: '0 4px 20px rgba(0,0,0,0.3)',
    shadowLight: '0 2px 10px rgba(0,0,0,0.2)',
    
    // États
    success: '#2ecc71',
    warning: '#f39c12',
    danger: '#e74c3c',
    info: '#3498db',
    
    // Accents (inchangés)
    accent: '#667eea',
    accentGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  
  light: {
    name: 'light',
    // Arrière-plans
    background: '#f0f4f8',
    backgroundSolid: '#f0f4f8',
    backgroundSecondary: '#e8eef4',
    
    // Sidebar & Header
    sidebar: '#ffffff',
    header: '#ffffff',
    
    // Cartes
    card: '#ffffff',
    cardHover: '#f8fafc',
    cardSolid: '#ffffff',
    
    // Textes
    text: '#1e293b',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    
    // Bordures
    border: 'rgba(0,0,0,0.1)',
    borderLight: 'rgba(0,0,0,0.05)',
    
    // Inputs
    inputBackground: '#ffffff',
    inputBorder: '#e2e8f0',
    inputText: '#1e293b',
    inputPlaceholder: '#94a3b8',
    
    // Overlays
    overlay: 'rgba(0,0,0,0.3)',
    modalBackground: '#ffffff',
    
    // Shadows
    shadow: '0 4px 20px rgba(0,0,0,0.1)',
    shadowLight: '0 2px 10px rgba(0,0,0,0.05)',
    
    // États (légèrement ajustés pour meilleur contraste)
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    
    // Accents (inchangés)
    accent: '#667eea',
    accentGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  }
};

// Fonction pour détecter la préférence système
const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark'; // Défaut
};

export const ThemeProvider = ({ children }) => {
  // Initialiser depuis localStorage ou défaut 'dark'
  // Peut être 'dark', 'light', ou 'auto'
  const [themePreference, setThemePreference] = useState(() => {
    const saved = localStorage.getItem('pl4to_theme');
    return saved || 'dark';
  });
  
  // État pour le thème système (utilisé quand auto)
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  
  // Thème effectif (celui réellement appliqué)
  const effectiveThemeName = themePreference === 'auto' ? systemTheme : themePreference;
  
  // Thème actuel
  const theme = themes[effectiveThemeName] || themes.dark;
  
  // Écouter les changements de préférence système
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    
    // Ajouter le listener
    mediaQuery.addEventListener('change', handleChange);
    
    // Cleanup
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // Sauvegarder dans localStorage quand ça change
  useEffect(() => {
    localStorage.setItem('pl4to_theme', themePreference);
    
    // Appliquer les CSS variables sur :root
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });
    
    // Ajouter une classe sur body pour le CSS global
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${effectiveThemeName}`);
    
    console.log(`[ThemeContext] Préférence: ${themePreference}, Thème effectif: ${effectiveThemeName}`);
  }, [themePreference, effectiveThemeName, theme]);
  
  // Fonction pour basculer le thème
  const toggleTheme = () => {
    setThemePreference(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  // Fonction pour définir un thème spécifique ('dark', 'light', ou 'auto')
  const setTheme = (name) => {
    if (name === 'auto' || themes[name]) {
      setThemePreference(name);
    }
  };
  
  // Vérifier si c'est le mode sombre (basé sur le thème effectif)
  const isDark = effectiveThemeName === 'dark';
  const isLight = effectiveThemeName === 'light';
  const isAuto = themePreference === 'auto';
  
  return (
    <ThemeContext.Provider value={{
      theme,
      themeName: effectiveThemeName,
      themePreference,
      isDark,
      isLight,
      isAuto,
      toggleTheme,
      setTheme,
      themes
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personnalisé
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
