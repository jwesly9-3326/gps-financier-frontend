// 🌍 Configuration i18n pour PL4TO
// Supporte Français (défaut) et Anglais

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationFR from '../locales/fr/translation.json';
import translationEN from '../locales/en/translation.json';

const resources = {
  fr: {
    translation: translationFR
  },
  en: {
    translation: translationEN
  }
};

i18n
  .use(LanguageDetector) // Détecte langue du navigateur
  .use(initReactI18next) // Passe i18n à react-i18next
  .init({
    resources,
    fallbackLng: 'fr', // Langue par défaut si non supportée
    lng: localStorage.getItem('pl4to_language') || 'fr', // Langue initiale
    
    interpolation: {
      escapeValue: false // React gère déjà l'échappement XSS
    },
    
    detection: {
      order: ['localStorage', 'navigator'], // Ordre de détection
      caches: ['localStorage'], // Cache la préférence
      lookupLocalStorage: 'pl4to_language' // Clé localStorage
    }
  });

export default i18n;
