// 🌍 Language Switcher Component
// Permet de changer la langue de l'application (FR/EN)

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const LanguageSwitcher = ({ style = 'buttons', size = 'normal' }) => {
  const { i18n } = useTranslation();
  const { isDark } = useTheme();
  
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('pl4to_language', lng);
  };
  
  const currentLang = i18n.language;

  // Style boutons (pour Header)
  if (style === 'buttons') {
    return (
      <div style={{
        display: 'flex',
        gap: '6px',
        alignItems: 'center'
      }}>
        <button
          onClick={() => changeLanguage('fr')}
          style={{
            padding: size === 'small' ? '6px 12px' : '8px 16px',
            border: currentLang === 'fr' ? 'none' : '2px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            background: currentLang === 'fr' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
              : 'rgba(255,255,255,0.1)',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: size === 'small' ? '0.8em' : '0.9em',
            transition: 'all 0.2s',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            if (currentLang !== 'fr') {
              e.target.style.background = 'rgba(255,255,255,0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentLang !== 'fr') {
              e.target.style.background = 'rgba(255,255,255,0.1)';
            }
          }}
        >
          🇫🇷 FR
        </button>
        <button
          onClick={() => changeLanguage('en')}
          style={{
            padding: size === 'small' ? '6px 12px' : '8px 16px',
            border: currentLang === 'en' ? 'none' : '2px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            background: currentLang === 'en' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
              : 'rgba(255,255,255,0.1)',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: size === 'small' ? '0.8em' : '0.9em',
            transition: 'all 0.2s',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            if (currentLang !== 'en') {
              e.target.style.background = 'rgba(255,255,255,0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentLang !== 'en') {
              e.target.style.background = 'rgba(255,255,255,0.1)';
            }
          }}
        >
          🇬🇧 EN
        </button>
      </div>
    );
  }

  // Style select (pour Paramètres)
  if (style === 'select') {
    return (
      <select
        value={currentLang}
        onChange={(e) => changeLanguage(e.target.value)}
        style={{
          padding: '12px 15px',
          fontSize: '1em',
          border: '2px solid #e0e0e0',
          borderRadius: '10px',
          background: 'white',
          cursor: 'pointer',
          outline: 'none',
          minWidth: '150px'
        }}
      >
        <option value="fr">🇫🇷 Français</option>
        <option value="en">🇬🇧 English</option>
      </select>
    );
  }

  // Style toggle (compact)
  if (style === 'toggle') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        borderRadius: '20px',
        padding: '4px',
        border: isDark ? 'none' : '1px solid rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={() => changeLanguage('fr')}
          style={{
            padding: '6px 14px',
            border: 'none',
            borderRadius: '16px',
            background: currentLang === 'fr' 
              ? (isDark ? 'white' : 'white') 
              : 'transparent',
            color: currentLang === 'fr' 
              ? '#667eea' 
              : (isDark ? 'white' : '#1e293b'),
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.85em',
            transition: 'all 0.2s',
            boxShadow: currentLang === 'fr' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
          }}
        >
          FR
        </button>
        <button
          onClick={() => changeLanguage('en')}
          style={{
            padding: '6px 14px',
            border: 'none',
            borderRadius: '16px',
            background: currentLang === 'en' 
              ? (isDark ? 'white' : 'white') 
              : 'transparent',
            color: currentLang === 'en' 
              ? '#667eea' 
              : (isDark ? 'white' : '#1e293b'),
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.85em',
            transition: 'all 0.2s',
            boxShadow: currentLang === 'en' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
          }}
        >
          EN
        </button>
      </div>
    );
  }

  return null;
};

export default LanguageSwitcher;
