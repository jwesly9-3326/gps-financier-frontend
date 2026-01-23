# 💎 GUIDE D'INTÉGRATION - Structure par Forfait

## 📁 Fichiers Créés

| Fichier | Description |
|---------|-------------|
| `src/context/SubscriptionContext.jsx` | Contexte de gestion des abonnements |
| `src/components/common/UpgradePrompt.jsx` | Composants UI (Modal, Banner, Badge, Overlay) |
| `src/hooks/useSubscriptionRestrictions.js` | Hook utilitaire pour les restrictions |

## 🔧 Configuration Effectuée

### 1. App.jsx
Le `SubscriptionProvider` a été ajouté autour de `UserDataProvider`:

```jsx
<AuthProvider>
  <SubscriptionProvider>
    <UserDataProvider>
      {/* Routes */}
    </UserDataProvider>
  </SubscriptionProvider>
</AuthProvider>
```

### 2. Traductions (FR/EN)
Les clés de traduction pour le système d'upgrade ont été ajoutées dans:
- `src/locales/fr/translation.json`
- `src/locales/en/translation.json`

---

## 📋 Limites par Plan

### Discovery (Gratuit)
| Limite | Valeur |
|--------|--------|
| GPS Views | Jour seulement |
| Projection | 1 an |
| Comptes max | 3 |
| Destinations max | 2 |
| Items budget max | 10 |
| Simulations/mois | 3 |

### Essentiel (14.99$/mois)
| Limite | Valeur |
|--------|--------|
| GPS Views | Jour + Mois + Année |
| Projection | 54 ans |
| Comptes | Illimité |
| Destinations | Illimité |
| Items budget | Illimité |
| Simulations | Illimité |

### Pro + IA (24.99$/mois) - BIENTÔT
- Tout Essentiel inclus
- Coach IA
- 5 profils famille

---

## 🔨 Comment Intégrer les Restrictions

### Exemple 1: GPS Financier (vues Mois/Année)

```jsx
// Dans GPSFinancier.jsx
import { useSubscription } from '../../context/SubscriptionContext';
import { UpgradeModal } from '../../components/common/UpgradePrompt';

const GPSFinancier = () => {
  const { canAccessGpsView, isFreePlan } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeType, setUpgradeType] = useState(null);

  // Modifier changeViewMode pour vérifier les permissions
  const changeViewMode = useCallback((newMode) => {
    // Vérifier si la vue est autorisée
    if (!canAccessGpsView(newMode)) {
      setUpgradeType(newMode === 'month' ? 'gpsMonth' : 'gpsYear');
      setShowUpgradeModal(true);
      return; // Ne pas changer de vue
    }
    
    // Code existant...
    setIsViewChanging(true);
    requestAnimationFrame(() => {
      setViewMode(newMode);
      viewChangeTimerRef.current = setTimeout(() => {
        setIsViewChanging(false);
      }, 600);
    });
  }, [canAccessGpsView]);

  // Dans le render, ajouter le modal
  return (
    <>
      {/* ... contenu existant ... */}
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureName={upgradeType}
      />
    </>
  );
};
```

### Exemple 2: Page Comptes (limite 3 comptes)

```jsx
// Dans Comptes.jsx
import { useSubscriptionRestrictions } from '../../hooks/useSubscriptionRestrictions';
import { UpgradeModal, UpgradeBanner, LimitBadge } from '../../components/common/UpgradePrompt';

const Comptes = () => {
  const { 
    checkAddAccount, 
    upgradeModal, 
    closeUpgradeModal,
    getLimitBadge,
    isFreePlan 
  } = useSubscriptionRestrictions();
  
  const accounts = userData?.accounts || [];
  const accountLimit = getLimitBadge('accounts', accounts.length);

  // Modifier la fonction d'ajout de compte
  const handleAddAccount = () => {
    if (!checkAddAccount(accounts.length)) {
      return; // Le modal s'affiche automatiquement
    }
    // Ouvrir le formulaire d'ajout...
  };

  return (
    <>
      {/* Banner si proche de la limite */}
      {accountLimit?.isNearLimit && !accountLimit.isAtLimit && (
        <UpgradeBanner 
          limitType="accounts"
          currentCount={accounts.length}
          maxCount={accountLimit.max}
        />
      )}
      
      {/* Header avec badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h1>Mes Comptes</h1>
        {accountLimit && (
          <LimitBadge 
            current={accounts.length} 
            max={accountLimit.max} 
          />
        )}
      </div>

      {/* Bouton Ajouter */}
      <button 
        onClick={handleAddAccount}
        disabled={accountLimit?.isAtLimit}
      >
        {accountLimit?.isAtLimit ? '🔒 Limite atteinte' : '+ Ajouter'}
      </button>

      {/* Modal d'upgrade */}
      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={closeUpgradeModal}
        limitType={upgradeModal.type}
        currentCount={upgradeModal.data.current}
        maxCount={upgradeModal.data.max}
      />
    </>
  );
};
```

### Exemple 3: Page Objectifs (limite 2 destinations)

```jsx
// Dans Objectifs.jsx
import { useSubscriptionRestrictions } from '../../hooks/useSubscriptionRestrictions';
import { UpgradeModal, LimitBadge } from '../../components/common/UpgradePrompt';

const Objectifs = () => {
  const { 
    checkAddDestination, 
    upgradeModal, 
    closeUpgradeModal,
    getLimitBadge 
  } = useSubscriptionRestrictions();
  
  const goals = userData?.financialGoals || [];
  const destinationLimit = getLimitBadge('destinations', goals.length);

  const handleAddDestination = () => {
    if (!checkAddDestination(goals.length)) {
      return;
    }
    // Ouvrir le formulaire...
  };

  // ...
};
```

### Exemple 4: Page Calculatrice (limite 3 simulations/mois)

```jsx
// Dans Simulations.jsx
import { useSubscriptionRestrictions } from '../../hooks/useSubscriptionRestrictions';
import { UpgradeModal, LimitBadge } from '../../components/common/UpgradePrompt';

const Simulations = () => {
  const { 
    checkRunSimulation,
    incrementSimulation,
    getRemainingSimulations,
    upgradeModal, 
    closeUpgradeModal,
    usage 
  } = useSubscriptionRestrictions();

  const remaining = getRemainingSimulations();

  const handleRunSimulation = () => {
    if (!checkRunSimulation()) {
      return;
    }
    
    // Incrémenter le compteur
    incrementSimulation();
    
    // Lancer la simulation...
  };

  return (
    <>
      {/* Afficher les simulations restantes */}
      {remaining !== Infinity && (
        <div>
          Simulations restantes ce mois: {remaining}/3
        </div>
      )}
      
      <button onClick={handleRunSimulation}>
        🧮 GO - Calculer
      </button>

      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={closeUpgradeModal}
        limitType={upgradeModal.type}
        currentCount={upgradeModal.data.current}
        maxCount={upgradeModal.data.max}
      />
    </>
  );
};
```

### Exemple 5: Page Budget (limite 10 items)

```jsx
// Dans Budget.jsx
import { useSubscriptionRestrictions } from '../../hooks/useSubscriptionRestrictions';
import { UpgradeModal, UpgradeBanner, LimitBadge } from '../../components/common/UpgradePrompt';

const Budget = () => {
  const { 
    checkAddBudgetItem, 
    upgradeModal, 
    closeUpgradeModal,
    getLimitBadge 
  } = useSubscriptionRestrictions();
  
  const entrees = userData?.budgetPlanning?.entrees || [];
  const sorties = userData?.budgetPlanning?.sorties || [];
  const totalItems = entrees.length + sorties.length;
  const budgetLimit = getLimitBadge('budgetItems', totalItems);

  const handleAddBudgetItem = () => {
    if (!checkAddBudgetItem(totalItems)) {
      return;
    }
    // Ouvrir le formulaire...
  };

  // ...
};
```

---

## 🧪 Comment Tester

### Méthode 1: Via Console
```javascript
// Ouvrir la console du navigateur (F12)

// Changer de plan
localStorage.setItem('pl4to_subscription_plan', 'essential');
location.reload();

// Revenir à Discovery
localStorage.setItem('pl4to_subscription_plan', 'discovery');
location.reload();

// Simuler des simulations utilisées
const usage = JSON.parse(localStorage.getItem('pl4to_subscription_usage') || '{}');
usage.simulationsThisMonth = 3;
localStorage.setItem('pl4to_subscription_usage', JSON.stringify(usage));
location.reload();
```

### Méthode 2: Via le Context (Dev)
```jsx
// Temporairement dans un composant
const { changePlan, resetUsage } = useSubscription();

// Boutons de test (à retirer en production)
<button onClick={() => changePlan('discovery')}>🌱 Discovery</button>
<button onClick={() => changePlan('essential')}>🚀 Essential</button>
<button onClick={() => resetUsage()}>🔄 Reset Usage</button>
```

---

## 📝 Checklist d'Intégration

### GPS Financier
- [ ] Import du hook/context
- [ ] Bloquer changement vers 'month' si Discovery
- [ ] Bloquer changement vers 'year' si Discovery
- [ ] Afficher UpgradeModal quand bloqué
- [ ] Griser les boutons Mois/Année si Discovery

### Page Comptes
- [ ] Import du hook
- [ ] Vérifier limite avant ajout
- [ ] Afficher LimitBadge dans header
- [ ] Afficher UpgradeBanner si proche limite
- [ ] Désactiver bouton si limite atteinte

### Page Objectifs
- [ ] Import du hook
- [ ] Vérifier limite avant ajout
- [ ] Afficher LimitBadge
- [ ] Afficher UpgradeBanner si proche limite

### Page Budget
- [ ] Import du hook
- [ ] Vérifier limite avant ajout (entrées + sorties)
- [ ] Afficher LimitBadge
- [ ] Afficher UpgradeBanner si proche limite

### Page Calculatrice
- [ ] Import du hook
- [ ] Vérifier limite avant simulation
- [ ] Incrémenter compteur après simulation
- [ ] Afficher compteur restant
- [ ] Afficher UpgradeModal quand limite atteinte

### Page Paramètres
- [ ] Mettre à jour l'affichage du plan actuel dynamiquement
- [ ] Connecter le bouton "Upgrade" à un système de paiement (futur)

---

## 🎨 Composants Disponibles

### UpgradeModal
Modal complet avec comparaison des plans.
```jsx
<UpgradeModal
  isOpen={boolean}
  onClose={function}
  limitType="accounts" | "destinations" | "budgetItems" | "simulations"
  featureName="gpsMonth" | "gpsYear" | "timeline" | "export"
  currentCount={number}
  maxCount={number}
/>
```

### UpgradeBanner
Bannière inline pour alerter l'utilisateur.
```jsx
<UpgradeBanner
  limitType="accounts" | "destinations" | "budget" | "simulations"
  currentCount={number}
  maxCount={number}
  compact={boolean} // Version compacte
/>
```

### LimitBadge
Petit badge affichant le compteur.
```jsx
<LimitBadge
  current={number}
  max={number}
/>
```

### FeatureLockedOverlay
Overlay sur une feature verrouillée.
```jsx
<FeatureLockedOverlay featureName="gpsMonth" showOverlay={isFreePlan()}>
  {children}
</FeatureLockedOverlay>
```

---

## 🚀 Prochaines Étapes

1. **Intégrer les restrictions** dans chaque composant selon les exemples ci-dessus
2. **Tester** chaque restriction en passant de Discovery à Essential
3. **Créer la checklist post-onboarding** pour guider les utilisateurs
4. **Préparer le lancement** (déploiement, monitoring, analytics)

---

*Document créé le 26 décembre 2025*
