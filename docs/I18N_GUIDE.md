# 🌍 Guide d'Internationalisation (i18n) - GPS Financier (Pl4to)

## Table des matières
1. [Architecture i18n](#1-architecture-i18n)
2. [Structure des fichiers](#2-structure-des-fichiers)
3. [Namespaces et clés de traduction](#3-namespaces-et-clés-de-traduction)
4. [Composants internationalisés](#4-composants-internationalisés)
5. [Patterns de formatage](#5-patterns-de-formatage)
6. [Guide: Ajouter une nouvelle langue](#6-guide-ajouter-une-nouvelle-langue)
7. [Checklist de traduction](#7-checklist-de-traduction)
8. [Bonnes pratiques](#8-bonnes-pratiques)

---

## 1. Architecture i18n

### Technologies utilisées
- **i18next** - Framework i18n principal
- **react-i18next** - Binding React pour i18next
- **i18next-browser-languagedetector** - Détection automatique de la langue

### Installation des dépendances
```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

### Point d'entrée
Le fichier de configuration est : `src/i18n/config.js`

```javascript
// 🌍 Configuration i18n pour PL4TO
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationFR from '../locales/fr/translation.json';
import translationEN from '../locales/en/translation.json';
// ➕ Pour ajouter une langue: import translationES from '../locales/es/translation.json';

const resources = {
  fr: { translation: translationFR },
  en: { translation: translationEN }
  // ➕ Pour ajouter: es: { translation: translationES }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',                              // Langue par défaut
    lng: localStorage.getItem('pl4to_language') || 'fr',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'pl4to_language'
    }
  });

export default i18n;
```

### Intégration dans l'app
Dans `src/main.jsx`:
```javascript
import './i18n/config';  // Importer AVANT App
import App from './App';
```

---

## 2. Structure des fichiers

```
src/
├── i18n/
│   └── config.js                    # Configuration i18next
├── locales/
│   ├── fr/
│   │   └── translation.json         # 🇫🇷 Traductions françaises (~47KB, 1500+ clés)
│   ├── en/
│   │   └── translation.json         # 🇬🇧 Traductions anglaises (~47KB, 1500+ clés)
│   └── es/                          # 🇪🇸 À créer pour l'espagnol
│       └── translation.json
├── components/
│   └── common/
│       └── LanguageSwitcher.jsx     # Sélecteur de langue UI
```

---

## 3. Namespaces et clés de traduction

### Structure hiérarchique du fichier translation.json

```
translation.json
├── common                  # Termes génériques réutilisables
├── greeting               # Salutations selon l'heure
├── nav                    # Navigation sidebar/header
├── auth                   # Authentification (login, register, errors)
├── landing                # Page d'accueil publique
├── logout                 # Modal de déconnexion
├── accounts               # Page Mes Comptes
├── budget                 # Page Mon Budget
├── gps                    # Page GPS Financier (la plus volumineuse)
├── goals                  # Page Mes Objectifs
├── calculator             # Page Calculatrice/Simulations
├── dashboard              # Page Dashboard
├── management             # Page Gestion de Comptes
├── settings               # Page Paramètres (6 sections + 7 modals)
├── days                   # Jours de la semaine
├── months                 # Mois de l'année
└── onboarding             # Flux d'onboarding (si traduit)
```

### Détail par namespace

#### `common` (~25 clés)
```json
{
  "common": {
    "appName": "Pl4to",
    "tagline": "Naviguez vers votre nouvelle économie",
    "loading": "Chargement...",
    "save": "Sauvegarder",
    "cancel": "Annuler",
    "delete": "Supprimer",
    "edit": "Modifier",
    "close": "Fermer",
    "confirm": "Confirmer",
    "back": "Retour",
    "next": "Suivant",
    "yes": "Oui",
    "no": "Non",
    "today": "Aujourd'hui",
    "tomorrow": "Demain",
    "yesterday": "Hier"
  }
}
```

#### `nav` (~10 clés)
```json
{
  "nav": {
    "home": "Accueil",
    "dashboard": "Dashboard",
    "accounts": "Comptes",
    "budget": "Budget",
    "gps": "GPS Financier",
    "goals": "Objectifs",
    "calculator": "Calculatrice",
    "management": "Gestion de comptes",
    "settings": "Paramètres",
    "logout": "Déconnexion"
  }
}
```

#### `auth` (~30 clés)
```json
{
  "auth": {
    "login": {
      "title": "Connexion",
      "subtitle": "Reprenez votre voyage financier 🚀",
      "email": "Email",
      "password": "Mot de passe",
      "submit": "Reprendre mon voyage",
      "error": "Courriel ou mot de passe incorrect"
    },
    "register": { "..." },
    "errors": { "..." }
  }
}
```

#### `accounts` (~50 clés)
```json
{
  "accounts": {
    "title": "Mes Comptes",
    "types": {
      "cheque": "Compte chèque",
      "epargne": "Compte épargne",
      "credit": "Carte de crédit",
      "investissement": "Investissement"
    },
    "transactions": { "..." }
  }
}
```

#### `budget` (~80 clés)
```json
{
  "budget": {
    "title": "Mon Budget",
    "entries": "Entrées",
    "expenses": "Sorties",
    "frequencies": {
      "monthly": "Mensuel",
      "biweekly": "Aux 2 semaines",
      "weekly": "Hebdomadaire",
      "annual": "Annuel"
    }
  }
}
```

#### `gps` (~150 clés) - LE PLUS VOLUMINEUX
```json
{
  "gps": {
    "title": "GPS Financier",
    "views": {
      "day": "Jour",
      "month": "Mois",
      "year": "Année"
    },
    "timeline": { "..." },
    "popup": { "..." },
    "alerts": { "..." },
    "destinations": { "..." }
  }
}
```

#### `goals` (~40 clés)
```json
{
  "goals": {
    "title": "Mes Objectifs",
    "types": {
      "urgence": "Fonds d'urgence",
      "dette": "Remboursement dette",
      "epargne": "Épargne projet",
      "investissement": "Investissement",
      "retraite": "Retraite"
    }
  }
}
```

#### `calculator` (~60 clés)
```json
{
  "calculator": {
    "title": "Calculatrice",
    "animation": { "..." },
    "quickTests": { "..." },
    "results": { "..." }
  }
}
```

#### `settings` (~400 clés) - TRÈS VOLUMINEUX
```json
{
  "settings": {
    "title": "Paramètres",
    "nav": { "..." },
    "profile": { "..." },
    "subscription": { "..." },
    "preferences": { "..." },
    "notifications": { "..." },
    "security": { "..." },
    "about": {
      "modals": {
        "guide": { "..." },
        "faq": { "..." },
        "versions": { "..." },
        "contact": { "..." },
        "legal": { "..." },
        "privacy": { "..." },
        "bug": { "..." }
      }
    }
  }
}
```

#### `days` et `months`
```json
{
  "days": {
    "sunday": "Dimanche",
    "monday": "Lundi",
    "tuesday": "Mardi",
    "wednesday": "Mercredi",
    "thursday": "Jeudi",
    "friday": "Vendredi",
    "saturday": "Samedi",
    "short": {
      "sun": "Dim", "mon": "Lun"
    }
  },
  "months": {
    "january": "Janvier",
    "february": "Février"
  }
}
```

---

## 4. Composants internationalisés

### Liste complète des composants utilisant i18n

| Composant | Chemin | Clés principales |
|-----------|--------|------------------|
| **Header** | `components/layout/Header.jsx` | `nav.*` |
| **Sidebar** | `components/layout/Sidebar.jsx` | `nav.*`, `logout.*` |
| **LanguageSwitcher** | `components/common/LanguageSwitcher.jsx` | - |
| **LandingPage** | `pages/Landing/LandingPage.jsx` | `landing.*` |
| **Login** | `pages/Auth/Login.jsx` | `auth.login.*`, `auth.errors.*` |
| **Register** | `pages/Auth/Register.jsx` | `auth.register.*`, `auth.errors.*` |
| **Dashboard** | `pages/Dashboard/Dashboard.jsx` | `dashboard.*`, `greeting.*` |
| **CalendrierO** | `components/dashboard/CalendrierO.jsx` | `days.*`, `months.*` |
| **HorizonEvenements** | `components/dashboard/HorizonEvenements.jsx` | `dashboard.horizon.*` |
| **Comptes** | `pages/Comptes/Comptes.jsx` | `accounts.*` |
| **Budget** | `pages/Budget/Budget.jsx` | `budget.*`, `days.*` |
| **GPSFinancier** | `pages/GPS/GPSFinancier.jsx` | `gps.*`, `days.*`, `months.*` |
| **Objectifs** | `pages/Objectifs/Objectifs.jsx` | `goals.*` |
| **Simulations** | `pages/Simulations/Simulations.jsx` | `calculator.*` |
| **GestionComptes** | `pages/GestionComptes/GestionComptes.jsx` | `management.*` |
| **Parametres** | `pages/Parametres/Parametres.jsx` | `settings.*` |

### Pattern d'utilisation dans un composant

```jsx
import { useTranslation } from 'react-i18next';

const MonComposant = () => {
  const { t, i18n } = useTranslation();
  
  // Traduction simple
  <h1>{t('accounts.title')}</h1>
  
  // Avec interpolation
  <p>{t('budget.balance.negative', { amount: '500$' })}</p>
  
  // Accès à la langue actuelle
  const currentLang = i18n.language; // 'fr' ou 'en'
  
  // Changement de langue
  i18n.changeLanguage('es');
};
```

---

## 5. Patterns de formatage

### Formatage des devises (selon la langue)

```javascript
// Français: 1 234,56 $
// Anglais: $1,234.56

const formatMontant = (montant) => {
  const absValue = Math.abs(montant);
  const formatted = absValue.toLocaleString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  if (i18n.language === 'fr') {
    return montant < 0 ? `-${formatted} $` : `${formatted} $`;
  } else {
    return montant < 0 ? `-$${formatted}` : `$${formatted}`;
  }
};
```

### Formatage des dates (selon la langue)

```javascript
// Français: 26 décembre 2025
// Anglais: December 26, 2025

const formatDate = (date) => {
  return date.toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
```

### Jours de la semaine traduits

```javascript
// Pattern utilisé dans GPSFinancier.jsx et Budget.jsx
const getDayName = (dayIndex) => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return t(`days.${days[dayIndex]}`);
};
```

---

## 6. Guide: Ajouter une nouvelle langue

### Étape 1: Créer le fichier de traduction

```bash
# Copier le fichier français comme base
cp src/locales/fr/translation.json src/locales/es/translation.json
```

### Étape 2: Traduire le fichier

Ouvrir `src/locales/es/translation.json` et traduire toutes les valeurs.

**⚠️ IMPORTANT:** Ne jamais modifier les clés (à gauche du `:`), seulement les valeurs (à droite).

```json
// ❌ INCORRECT - clé modifiée
{ "titulo": "Mi Presupuesto" }

// ✅ CORRECT - seule la valeur est traduite
{ "title": "Mi Presupuesto" }
```

### Étape 3: Enregistrer la langue dans la config

```javascript
// src/i18n/config.js

import translationFR from '../locales/fr/translation.json';
import translationEN from '../locales/en/translation.json';
import translationES from '../locales/es/translation.json';  // ➕ AJOUTER

const resources = {
  fr: { translation: translationFR },
  en: { translation: translationEN },
  es: { translation: translationES }  // ➕ AJOUTER
};
```

### Étape 4: Mettre à jour le LanguageSwitcher

```jsx
// src/components/common/LanguageSwitcher.jsx

const languages = [
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'es', label: '🇪🇸 Español' }  // ➕ AJOUTER
];
```

### Étape 5: Ajouter le formatage localisé

Dans les composants utilisant `toLocaleDateString` ou `toLocaleString`, ajouter le cas espagnol:

```javascript
const getLocale = () => {
  switch(i18n.language) {
    case 'fr': return 'fr-CA';
    case 'en': return 'en-CA';
    case 'es': return 'es-ES';  // ➕ AJOUTER
    default: return 'fr-CA';
  }
};
```

### Étape 6: Tester

1. Changer la langue via le LanguageSwitcher
2. Vérifier chaque page de l'application
3. Vérifier les formats de dates et devises
4. Vérifier les modals et popups

---

## 7. Checklist de traduction

### ✅ Fichier translation.json complet

- [ ] `common` - Termes génériques
- [ ] `greeting` - Salutations
- [ ] `nav` - Navigation
- [ ] `auth.login` - Page connexion
- [ ] `auth.register` - Page inscription
- [ ] `auth.errors` - Messages d'erreur auth
- [ ] `landing` - Page d'accueil
- [ ] `logout` - Modal déconnexion
- [ ] `accounts` - Page Mes Comptes
- [ ] `accounts.types` - Types de comptes
- [ ] `accounts.transactions` - Transactions
- [ ] `budget` - Page Budget
- [ ] `budget.frequencies` - Fréquences
- [ ] `gps` - Page GPS Financier
- [ ] `gps.views` - Vues jour/mois/année
- [ ] `gps.timeline` - Timeline navigation
- [ ] `gps.popup` - Popup détails
- [ ] `gps.alerts` - Alertes destinations
- [ ] `goals` - Page Objectifs
- [ ] `goals.types` - Types d'objectifs
- [ ] `calculator` - Page Calculatrice
- [ ] `calculator.animation` - Animation intro
- [ ] `calculator.quickTests` - Tests rapides
- [ ] `management` - Gestion de comptes
- [ ] `dashboard` - Dashboard
- [ ] `dashboard.horizon` - Horizon événements
- [ ] `settings.nav` - Navigation paramètres
- [ ] `settings.profile` - Profil utilisateur
- [ ] `settings.subscription` - Abonnements (40+ clés)
- [ ] `settings.preferences` - Préférences
- [ ] `settings.notifications` - Notifications
- [ ] `settings.security` - Sécurité
- [ ] `settings.about` - À propos
- [ ] `settings.about.modals.guide` - Guide utilisateur
- [ ] `settings.about.modals.faq` - FAQ (8 Q&A)
- [ ] `settings.about.modals.versions` - Notes de version
- [ ] `settings.about.modals.contact` - Contact
- [ ] `settings.about.modals.legal` - Mentions légales
- [ ] `settings.about.modals.privacy` - Confidentialité
- [ ] `settings.about.modals.bug` - Signaler bug
- [ ] `days` - Jours de la semaine
- [ ] `days.short` - Jours abrégés
- [ ] `months` - Mois de l'année

### ✅ Vérifications post-traduction

- [ ] Aucune clé manquante (console sans warnings)
- [ ] Formats de devises corrects
- [ ] Formats de dates corrects
- [ ] Pluriels gérés si nécessaire
- [ ] Emojis préservés
- [ ] Longueur du texte acceptable (pas de débordement UI)

---

## 8. Bonnes pratiques

### ✅ À faire

1. **Utiliser des clés descriptives et hiérarchiques**
   ```json
   "settings.profile.emailChange.sendCode"
   ```

2. **Grouper par fonctionnalité**
   ```json
   {
     "accounts": {
       "title": "...",
       "types": { },
       "transactions": { }
     }
   }
   ```

3. **Utiliser l'interpolation pour les valeurs dynamiques**
   ```json
   "lastChange": "Dernière modification: Il y a {{days}} jours"
   ```
   ```jsx
   t('lastChange', { days: 23 })
   ```

4. **Centraliser les termes communs**
   ```json
   "common.save", "common.cancel", "common.delete"
   ```

5. **Garder les emojis dans le code JSX, pas dans les traductions**
   ```jsx
   // ✅ BON
   <span>📧 {t('settings.about.links.contact')}</span>
   
   // ❌ MAUVAIS - dans translation.json
   "contact": "📧 Nous contacter"
   ```

### ❌ À éviter

1. **Ne pas concaténer des traductions**
   ```jsx
   // ❌ MAUVAIS
   t('hello') + ' ' + t('world')
   
   // ✅ BON
   t('helloWorld')
   ```

2. **Ne pas hardcoder de texte dans les composants traduits**
   ```jsx
   // ❌ MAUVAIS
   <button>Sauvegarder</button>
   
   // ✅ BON
   <button>{t('common.save')}</button>
   ```

3. **Ne pas modifier les clés entre les fichiers de langue**

4. **Ne pas oublier les messages d'erreur et les tooltips**

---

## Statistiques du projet

| Métrique | Valeur |
|----------|--------|
| Langues supportées | 2 (FR, EN) |
| Taille fichier translation.json | ~47 KB |
| Nombre de clés | ~1500+ |
| Composants internationalisés | 17+ |
| Pages traduites | 10 |
| Modals traduits | 12+ |

---

## Fichiers à modifier pour ajouter une langue

| Fichier | Action |
|---------|--------|
| `src/locales/[lang]/translation.json` | Créer et traduire |
| `src/i18n/config.js` | Ajouter import et resource |
| `src/components/common/LanguageSwitcher.jsx` | Ajouter option |
| Composants avec `toLocaleDateString` | Ajouter locale |
| Composants avec `toLocaleString` | Ajouter locale |

---

## Ressources

- [Documentation i18next](https://www.i18next.com/)
- [Documentation react-i18next](https://react.i18next.com/)
- [Guide interpolation](https://www.i18next.com/translation-function/interpolation)
- [Pluralization](https://www.i18next.com/translation-function/plurals)

---

*Document créé le 26 décembre 2025 - GPS Financier (Pl4to) v1.0.0 Beta*
